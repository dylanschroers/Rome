import { findGame, viewFor } from '../shared/games/index.js';

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_NAME_LENGTH = 24;
export const MAX_ROOM_MESSAGES = 200;
export const MAX_TABLE_MESSAGES = 50;
export const SEATS_PER_TABLE = 4;
export const MESSAGES_PER_WINDOW = 8;
export const MESSAGE_WINDOW_MS = 10_000;

export const TABLES = [
  { id: 'hearth', name: 'By the hearth' },
  { id: 'window', name: 'Window seat' },
  { id: 'barrel', name: 'The barrel' },
  { id: 'corner', name: 'Corner booth' },
  { id: 'long', name: 'Long table' },
  { id: 'back', name: 'Back room' },
];

export function cleanText(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, limit).trim();
}

export function cleanName(value) {
  return cleanText(typeof value === 'string' ? value.replace(/\s+/g, ' ') : value, MAX_NAME_LENGTH);
}

const cleanGuestId = (value) => {
  const id = cleanText(value, 64);
  return /^[\w-]+$/.test(id) ? id : '';
};

// Everything the Tavern knows: who is in the room, who sits where, and what was said.
// Connections are identified by an id the caller chooses, such as the socket id.
export function createTavern({ now = () => Date.now(), makeId, random = Math.random } = {}) {
  let nextPresence = 1;
  let nextMessage = 1;
  const newPresenceId = makeId || (() => `p${nextPresence++}`);
  const guests = new Map();
  const roomMessages = [];
  const tables = TABLES.map((table) => ({
    ...table,
    seats: Array(SEATS_PER_TABLE).fill(null),
    messages: [],
    game: null,
  }));

  const findTable = (id) => tables.find((table) => table.id === id) || null;

  function seatOf(presenceId) {
    for (const table of tables) {
      const seat = table.seats.indexOf(presenceId);
      if (seat !== -1) return { table, seat };
    }
    return null;
  }

  function allowMessage(guest) {
    const time = now();
    guest.sent = guest.sent.filter((stamp) => time - stamp < MESSAGE_WINDOW_MS);
    if (guest.sent.length >= MESSAGES_PER_WINDOW) return false;
    guest.sent.push(time);
    return true;
  }

  function makeMessage(guest, content) {
    return {
      id: nextMessage++,
      userId: guest.guestId,
      name: guest.name,
      content,
      timestamp: new Date(now()).toISOString(),
    };
  }

  function standUp(guest) {
    const place = seatOf(guest.presenceId);
    if (!place) return null;
    const { table } = place;
    table.seats[place.seat] = null;
    if (table.game && !table.game.over) table.game = findGame(table.game.game).leave(table.game, guest.presenceId);
    if (table.seats.every((seat) => seat === null)) {
      table.messages = [];
      table.game = null;
    }
    return table.id;
  }

  return {
    join(connectionId, { guestId, name } = {}) {
      const id = cleanGuestId(guestId);
      if (!id) return { ok: false, reason: 'bad-guest' };
      const existing = guests.get(connectionId);
      if (existing) {
        existing.guestId = id;
        existing.name = cleanName(name) || existing.name;
        return { ok: true, presenceId: existing.presenceId };
      }
      const guest = { presenceId: newPresenceId(), guestId: id, name: cleanName(name) || 'Traveler', sent: [] };
      guests.set(connectionId, guest);
      return { ok: true, presenceId: guest.presenceId };
    },

    rename(connectionId, name) {
      const guest = guests.get(connectionId);
      const clean = cleanName(name);
      if (!guest || !clean) return { ok: false, reason: guest ? 'bad-name' : 'not-here' };
      guest.name = clean;
      return { ok: true };
    },

    sit(connectionId, tableId, seat) {
      const guest = guests.get(connectionId);
      if (!guest) return { ok: false, reason: 'not-here' };
      const table = findTable(tableId);
      if (!table) return { ok: false, reason: 'no-table' };

      const elsewhere = [...guests.values()].some((other) => (
        other !== guest && other.guestId === guest.guestId && seatOf(other.presenceId)
      ));
      if (elsewhere) return { ok: false, reason: 'seated-elsewhere' };

      const current = seatOf(guest.presenceId);
      if (current?.table === table && (seat === undefined || seat === null || seat === current.seat)) {
        return { ok: true, tableId: table.id, seat: current.seat, moved: false };
      }

      let target;
      if (seat === undefined || seat === null) {
        target = table.seats.indexOf(null);
        if (target === -1) return { ok: false, reason: 'full' };
      } else {
        if (!Number.isInteger(seat) || seat < 0 || seat >= table.seats.length) return { ok: false, reason: 'no-seat' };
        if (table.seats[seat] !== null) return { ok: false, reason: 'taken' };
        target = seat;
      }

      const left = current ? standUp(guest) : null;
      table.seats[target] = guest.presenceId;
      return { ok: true, tableId: table.id, seat: target, left, moved: true };
    },

    leaveTable(connectionId) {
      const guest = guests.get(connectionId);
      if (!guest) return { ok: false, reason: 'not-here' };
      const left = standUp(guest);
      return left ? { ok: true, tableId: left } : { ok: false, reason: 'not-seated' };
    },

    leave(connectionId) {
      const guest = guests.get(connectionId);
      if (!guest) return { wasHere: false, tableId: null };
      const tableId = standUp(guest);
      guests.delete(connectionId);
      return { wasHere: true, tableId };
    },

    sayInRoom(connectionId, data) {
      const guest = guests.get(connectionId);
      const content = cleanText(data?.content, MAX_MESSAGE_LENGTH);
      if (!guest) return { ok: false, reason: 'not-here' };
      if (!content) return { ok: false, reason: 'empty' };
      if (!allowMessage(guest)) return { ok: false, reason: 'too-fast' };
      const message = makeMessage(guest, content);
      roomMessages.push(message);
      if (roomMessages.length > MAX_ROOM_MESSAGES) roomMessages.splice(0, roomMessages.length - MAX_ROOM_MESSAGES);
      return { ok: true, message };
    },

    sayAtTable(connectionId, data) {
      const guest = guests.get(connectionId);
      const content = cleanText(data?.content, MAX_MESSAGE_LENGTH);
      if (!guest) return { ok: false, reason: 'not-here' };
      const place = seatOf(guest.presenceId);
      if (!place) return { ok: false, reason: 'not-seated' };
      if (!content) return { ok: false, reason: 'empty' };
      if (!allowMessage(guest)) return { ok: false, reason: 'too-fast' };
      const message = makeMessage(guest, content);
      place.table.messages.push(message);
      if (place.table.messages.length > MAX_TABLE_MESSAGES) place.table.messages.splice(0, place.table.messages.length - MAX_TABLE_MESSAGES);
      return { ok: true, message, tableId: place.table.id };
    },

    startGame(connectionId, gameId) {
      const guest = guests.get(connectionId);
      if (!guest) return { ok: false, reason: 'not-here' };
      const place = seatOf(guest.presenceId);
      if (!place) return { ok: false, reason: 'not-seated' };
      const game = findGame(gameId);
      if (!game) return { ok: false, reason: 'no-game' };
      const { table } = place;
      if (table.game && !table.game.over) return { ok: false, reason: 'game-running' };
      const byPresence = new Map([...guests.values()].map((other) => [other.presenceId, other]));
      const players = table.seats.filter(Boolean).map((id) => ({ id, name: byPresence.get(id)?.name ?? 'Traveler' }));
      if (players.length < game.minPlayers) return { ok: false, reason: 'need-players' };
      if (players.length > game.maxPlayers) return { ok: false, reason: 'too-many-players' };
      table.game = game.start(players, { random });
      return { ok: true, tableId: table.id };
    },

    playGame(connectionId, action) {
      const guest = guests.get(connectionId);
      if (!guest) return { ok: false, reason: 'not-here' };
      const place = seatOf(guest.presenceId);
      if (!place) return { ok: false, reason: 'not-seated' };
      const { table } = place;
      if (!table.game) return { ok: false, reason: 'no-game' };
      const result = findGame(table.game.game).act(table.game, guest.presenceId, action, { random });
      if (!result.ok) return result;
      table.game = result.state;
      return { ok: true, tableId: table.id };
    },

    gameAt: (tableId) => findTable(tableId)?.game ?? null,

    gameViewFor(connectionId, tableId) {
      const game = findTable(tableId)?.game ?? null;
      return viewFor(game, guests.get(connectionId)?.presenceId ?? null);
    },

    roomHistory: () => [...roomMessages],

    tableHistory(tableId) {
      return [...(findTable(tableId)?.messages ?? [])];
    },

    snapshot() {
      const byPresence = new Map([...guests.values()].map((guest) => [guest.presenceId, guest]));
      return {
        here: [...guests.values()].map((guest) => ({ id: guest.presenceId, name: guest.name })),
        tables: tables.map((table) => ({
          id: table.id,
          name: table.name,
          game: table.game ? { id: table.game.game, name: findGame(table.game.game).name, over: table.game.over } : null,
          seats: table.seats.map((presenceId) => {
            const guest = byPresence.get(presenceId);
            return guest ? { id: guest.presenceId, name: guest.name } : null;
          }),
        })),
      };
    },
  };
}
