import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_TABLE_MESSAGES, MESSAGES_PER_WINDOW, MESSAGE_WINDOW_MS, SEATS_PER_TABLE, TABLES, createTavern } from '../tavern.js';

function setup() {
  let time = Date.UTC(2026, 10, 6, 20);
  const tavern = createTavern({ now: () => time });
  return { tavern, tick: (ms) => { time += ms; } };
}

const seatsAt = (tavern, tableId) => tavern.snapshot().tables.find((table) => table.id === tableId).seats.map((seat) => seat?.name ?? null);

test('guests have to say who they are to come in', () => {
  const { tavern } = setup();
  assert.deepEqual(tavern.join('a', {}), { ok: false, reason: 'bad-guest' });
  assert.deepEqual(tavern.join('a', { guestId: 'bad id!' }), { ok: false, reason: 'bad-guest' });
  const joined = tavern.join('a', { guestId: 'guest_1', name: '  Old   Tom ' });
  assert.ok(joined.ok);
  assert.deepEqual(tavern.snapshot().here, [{ id: joined.presenceId, name: 'Old Tom' }]);
  assert.equal(tavern.join('a', { guestId: 'guest_1', name: 'Tom' }).presenceId, joined.presenceId);
  assert.equal(tavern.snapshot().here.length, 1);
});

test('a guest with no usable name is called Traveler', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'guest_1', name: '   ' });
  assert.equal(tavern.snapshot().here[0].name, 'Traveler');
  assert.equal(tavern.rename('a', '  ').ok, false);
  assert.equal(tavern.rename('a', 'Ann').ok, true);
  assert.equal(tavern.snapshot().here[0].name, 'Ann');
});

test('there are six tables of four empty seats', () => {
  const { tavern } = setup();
  const { tables } = tavern.snapshot();
  assert.equal(tables.length, TABLES.length);
  assert.ok(tables.every((table) => table.seats.length === SEATS_PER_TABLE && table.seats.every((seat) => seat === null)));
});

test('sitting takes the first free seat, or the one asked for', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.join('b', { guestId: 'g2', name: 'Bo' });
  assert.deepEqual(tavern.sit('a', 'hearth'), { ok: true, tableId: 'hearth', seat: 0, left: null, moved: true });
  assert.equal(tavern.sit('b', 'hearth', 2).seat, 2);
  assert.deepEqual(seatsAt(tavern, 'hearth'), ['Ann', null, 'Bo', null]);
});

test('a taken seat, a full table, or a made-up seat is refused', () => {
  const { tavern } = setup();
  for (let index = 0; index < 5; index += 1) tavern.join(`c${index}`, { guestId: `g${index}`, name: `G${index}` });
  assert.equal(tavern.sit('c0', 'hearth', 1).ok, true);
  assert.deepEqual(tavern.sit('c1', 'hearth', 1), { ok: false, reason: 'taken' });
  assert.deepEqual(tavern.sit('c1', 'hearth', 9), { ok: false, reason: 'no-seat' });
  assert.deepEqual(tavern.sit('c1', 'hearth', 1.5), { ok: false, reason: 'no-seat' });
  assert.deepEqual(tavern.sit('c1', 'nowhere'), { ok: false, reason: 'no-table' });
  for (const id of ['c1', 'c2', 'c3']) assert.equal(tavern.sit(id, 'hearth').ok, true);
  assert.deepEqual(tavern.sit('c4', 'hearth'), { ok: false, reason: 'full' });
  assert.deepEqual(tavern.sit('nobody', 'hearth'), { ok: false, reason: 'not-here' });
});

test('sitting at another table moves you there', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.sit('a', 'hearth');
  const moved = tavern.sit('a', 'window');
  assert.equal(moved.left, 'hearth');
  assert.deepEqual(seatsAt(tavern, 'hearth'), [null, null, null, null]);
  assert.deepEqual(seatsAt(tavern, 'window'), ['Ann', null, null, null]);
  assert.equal(tavern.sit('a', 'window').moved, false);
  assert.equal(tavern.sit('a', 'window', 3).seat, 3);
  assert.deepEqual(seatsAt(tavern, 'window'), [null, null, null, 'Ann']);
});

test('one guest gets one seat, even with two tabs open', () => {
  const { tavern } = setup();
  tavern.join('tab1', { guestId: 'g1', name: 'Ann' });
  tavern.join('tab2', { guestId: 'g1', name: 'Ann' });
  assert.equal(tavern.sit('tab1', 'hearth').ok, true);
  assert.deepEqual(tavern.sit('tab2', 'window'), { ok: false, reason: 'seated-elsewhere' });
  tavern.leaveTable('tab1');
  assert.equal(tavern.sit('tab2', 'window').ok, true);
});

test('leaving the table or the tavern frees the seat', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.join('b', { guestId: 'g2', name: 'Bo' });
  tavern.sit('a', 'hearth');
  tavern.sit('b', 'hearth');
  assert.deepEqual(tavern.leaveTable('a'), { ok: true, tableId: 'hearth' });
  assert.deepEqual(tavern.leaveTable('a'), { ok: false, reason: 'not-seated' });
  assert.deepEqual(tavern.leave('b'), { wasHere: true, tableId: 'hearth' });
  assert.deepEqual(seatsAt(tavern, 'hearth'), [null, null, null, null]);
  assert.equal(tavern.snapshot().here.length, 1);
  assert.deepEqual(tavern.leave('b'), { wasHere: false, tableId: null });
});

test('table talk stays at the table and ends when everyone leaves', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.join('b', { guestId: 'g2', name: 'Bo' });
  assert.deepEqual(tavern.sayAtTable('a', { content: 'hi' }), { ok: false, reason: 'not-seated' });
  tavern.sit('a', 'hearth');
  tavern.sit('b', 'hearth');
  const said = tavern.sayAtTable('a', { content: '  dice?  ' });
  assert.equal(said.tableId, 'hearth');
  assert.equal(said.message.content, 'dice?');
  assert.equal(said.message.name, 'Ann');
  assert.deepEqual(tavern.sayAtTable('a', { content: '   ' }), { ok: false, reason: 'empty' });
  assert.equal(tavern.tableHistory('hearth').length, 1);
  assert.equal(tavern.roomHistory().length, 0);
  tavern.leaveTable('a');
  assert.equal(tavern.tableHistory('hearth').length, 1);
  tavern.leave('b');
  assert.equal(tavern.tableHistory('hearth').length, 0);
});

test('table and room history are capped', () => {
  const { tavern, tick } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.sit('a', 'hearth');
  for (let index = 0; index < MAX_TABLE_MESSAGES + 5; index += 1) {
    tick(MESSAGE_WINDOW_MS);
    tavern.sayAtTable('a', { content: `line ${index}` });
  }
  const history = tavern.tableHistory('hearth');
  assert.equal(history.length, MAX_TABLE_MESSAGES);
  assert.equal(history[0].content, 'line 5');
  assert.deepEqual(tavern.tableHistory('nowhere'), []);
});

test('messages are long-capped and rate limited per guest', () => {
  const { tavern, tick } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  assert.equal(tavern.sayInRoom('a', { content: 'x'.repeat(900) }).message.content.length, 500);
  for (let index = 1; index < MESSAGES_PER_WINDOW; index += 1) assert.equal(tavern.sayInRoom('a', { content: `m${index}` }).ok, true);
  assert.deepEqual(tavern.sayInRoom('a', { content: 'one more' }), { ok: false, reason: 'too-fast' });
  tick(MESSAGE_WINDOW_MS);
  assert.equal(tavern.sayInRoom('a', { content: 'later' }).ok, true);
  assert.deepEqual(tavern.sayInRoom('ghost', { content: 'boo' }), { ok: false, reason: 'not-here' });
  assert.deepEqual(tavern.sayInRoom('a', null), { ok: false, reason: 'empty' });
});

test('names in the snapshot follow renames', () => {
  const { tavern } = setup();
  tavern.join('a', { guestId: 'g1', name: 'Ann' });
  tavern.sit('a', 'back');
  tavern.rename('a', 'Annie');
  assert.deepEqual(seatsAt(tavern, 'back'), ['Annie', null, null, null]);
});
