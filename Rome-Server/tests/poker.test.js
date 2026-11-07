import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actPoker, bestHand, blindsFor, compareScores, leavePoker, potTotal, startPoker, viewPoker } from '../../shared/games/poker.js';

const hand = (text) => bestHand(text.split(' '));
const beats = (a, b) => compareScores(hand(a).score, hand(b).score) > 0;

test('hands are named plainly', () => {
  assert.equal(hand('As Ks Qs Js Ts 2d 3c').name, 'Royal flush');
  assert.equal(hand('9h 8h 7h 6h 5h Ad Ac').name, 'Straight flush, nine high');
  assert.equal(hand('Ah Ad Ac As 5h 5d 2c').name, 'Four aces');
  assert.equal(hand('Kh Kd Kc 2s 2h 9d 3c').name, 'Full house, kings over twos');
  assert.equal(hand('Ah 9h 7h 4h 2h Kd Qc').name, 'Flush, ace high');
  assert.equal(hand('Ah 2d 3c 4s 5h 9d Kc').name, 'Straight, five high');
  assert.equal(hand('6h 6d 6c Ks 2h 9d 3c').name, 'Three sixes');
  assert.equal(hand('Ah Ad 5c 5s 2h 9d 3c').name, 'Two pair, aces and fives');
  assert.equal(hand('Th Td 5c 7s 2h 9d 3c').name, 'Pair of tens');
  assert.equal(hand('Ah Jd 5c 7s 2h 9d 3c').name, 'Ace high');
});

test('hands rank in the usual order', () => {
  const ladder = [
    'As Ks Qs Js Ts', '9h 8h 7h 6h 5h', 'Ah Ad Ac As 5h', 'Kh Kd Kc 2s 2h', 'Ah 9h 7h 4h 2h',
    'Th 9d 8c 7s 6h', '6h 6d 6c Ks 2h', 'Ah Ad 5c 5s 2h', 'Th Td 5c 7s 2h', 'Ah Jd 5c 7s 2h',
  ];
  for (let index = 0; index < ladder.length - 1; index += 1) assert.ok(beats(ladder[index], ladder[index + 1]), `${ladder[index]} should beat ${ladder[index + 1]}`);
});

test('kickers, the low straight, and the best five out of seven', () => {
  assert.ok(beats('Ah Ad Kc 7s 2h', 'Ah Ad Qc 7s 2h'));
  assert.ok(beats('6h 2d 3c 4s 5h', 'Ah 2d 3c 4s 5h'));
  assert.equal(compareScores(hand('Ah Kd 5c 5s 2h 9d 3c').score, hand('Ac Kh 5d 5h 2s 9c 3d').score), 0);
  assert.deepEqual(hand('2h 3h 4h 5h 6h 7h 8h').score, [8, 8]);
  assert.equal(hand('Ah Ad Ac Kd Kc Ks 2c').name, 'Full house, aces over kings');
});

test('blinds start at 10 and 20 and double every eight hands', () => {
  assert.deepEqual(blindsFor(1), { small: 10, big: 20 });
  assert.deepEqual(blindsFor(8), { small: 10, big: 20 });
  assert.deepEqual(blindsFor(9), { small: 20, big: 40 });
  assert.deepEqual(blindsFor(17), { small: 40, big: 80 });
});

// A deck arranged so the shuffle deals exactly these cards, in order.
function stacked(cards) {
  const RANKS = '23456789TJQKA';
  const order = [...'shdc'].flatMap((suit) => [...RANKS].map((rank) => `${rank}${suit}`));
  const wanted = [...cards, ...order.filter((card) => !cards.includes(card))];
  const picks = [];
  const deck = [...order];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const want = wanted[index];
    const from = deck.indexOf(want);
    picks.push(from);
    [deck[index], deck[from]] = [deck[from], deck[index]];
  }
  return picks;
}

function dealer(cards, dealerPick = 0) {
  const picks = stacked(cards);
  let call = 0;
  return () => {
    if (call === 0) {
      call += 1;
      return dealerPick;
    }
    const index = picks[(call - 1) % picks.length];
    const size = 52 - ((call - 1) % 51);
    call += 1;
    return (index + 0.5) / size;
  };
}

// Cards come off the top of the deck: two each in seat order, then a burn and the flop, and so on.
function game(players, cards) {
  return startPoker(players.map((id) => ({ id, name: id.toUpperCase() })), { random: dealer(cards.split(' ')) });
}

function act(state, ...steps) {
  let current = state;
  for (const [id, type, to] of steps) {
    const result = actPoker(current, id, { type, to });
    assert.ok(result.ok, `${id} ${type} failed: ${result.reason}`);
    current = result.state;
  }
  return current;
}

const chips = (state) => Object.fromEntries(state.players.map((player) => [player.id, player.chips]));

test('a hand deals two cards each and posts the blinds', () => {
  const state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  assert.equal(state.dealer, 0);
  assert.deepEqual(state.players.map((player) => player.cards), [['As', 'Kd'], ['2c', '2d'], ['7h', '7s']]);
  assert.deepEqual(state.players.map((player) => player.bet), [0, 10, 20]);
  assert.equal(state.toAct, 0);
  assert.equal(potTotal(state.players), 30);
});

test('heads-up, the dealer posts the small blind and acts first', () => {
  const state = game(['a', 'b'], 'As Kd 2c 2d');
  assert.deepEqual(state.players.map((player) => player.bet), [10, 20]);
  assert.equal(state.toAct, 0);
});

test('only the player to act can act, and only with legal amounts', () => {
  const state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  assert.deepEqual(actPoker(state, 'b', { type: 'call' }), { ok: false, reason: 'not-your-turn' });
  assert.deepEqual(actPoker(state, 'a', { type: 'check' }), { ok: false, reason: 'must-call' });
  assert.deepEqual(actPoker(state, 'a', { type: 'raise', to: 30 }), { ok: false, reason: 'raise-too-small' });
  assert.deepEqual(actPoker(state, 'a', { type: 'raise', to: 5000 }), { ok: false, reason: 'bad-amount' });
  assert.deepEqual(actPoker(state, 'a', { type: 'raise', to: 'lots' }), { ok: false, reason: 'bad-amount' });
  assert.deepEqual(actPoker(state, 'z', { type: 'call' }), { ok: false, reason: 'not-playing' });
  assert.deepEqual(actPoker(state, 'a', { type: 'next-hand' }), { ok: false, reason: 'hand-running' });
});

test('the big blind gets a chance to raise when everyone just calls', () => {
  let state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  state = act(state, ['a', 'call'], ['b', 'call']);
  assert.equal(state.street, 'preflop');
  assert.equal(state.toAct, 2);
  state = act(state, ['c', 'check']);
  assert.equal(state.street, 'flop');
  assert.equal(state.board.length, 3);
  assert.equal(state.toAct, 1);
});

test('everyone folding to a raise wins the pot without showing', () => {
  let state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  state = act(state, ['a', 'raise', 60], ['b', 'fold'], ['c', 'fold']);
  assert.equal(state.handOver, true);
  assert.equal(state.showdown, null);
  assert.deepEqual(state.last, { kind: 'fold-win', playerId: 'a' });
  assert.deepEqual(chips(state), { a: 1030, b: 990, c: 980 });
});

test('a full hand checks down to the best hand at showdown', () => {
  let state = game(['a', 'b'], 'As Ad Kc Kd 9s 2h 5c 8d 3s Jh 4c Qd');
  state = act(state, ['a', 'call'], ['b', 'check']);
  for (const street of ['flop', 'turn', 'river']) {
    assert.equal(state.street, street);
    state = act(state, ['b', 'check'], ['a', 'check']);
  }
  assert.deepEqual(state.board, ['2h', '5c', '8d', 'Jh', 'Qd']);
  assert.equal(state.handOver, true);
  assert.deepEqual(state.payouts, [{ id: 'a', amount: 40 }]);
  assert.equal(state.showdown.find((entry) => entry.id === 'a').hand, 'Pair of aces');
  assert.deepEqual(chips(state), { a: 1020, b: 980 });
});

test('a tie splits the pot', () => {
  let state = game(['a', 'b'], 'As 2d Ac 2h 9s Kh Kd Ks Qs 3s Js');
  state = act(state, ['a', 'call'], ['b', 'check']);
  for (let street = 0; street < 3; street += 1) state = act(state, ['b', 'check'], ['a', 'check']);
  assert.deepEqual(chips(state), { a: 1000, b: 1000 });
});

test('an all-in runs out the board and builds a side pot', () => {
  let state = startPoker([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], { random: dealer('As Ad Kc Kd 2s 7h 9s 3h 5c 8d 4s Jh Qc'.split(' ')), chips: 1000 });
  state = { ...state, players: state.players.map((player) => (player.id === 'a' ? { ...player, chips: 200 } : player)) };
  state = act(state, ['a', 'raise', 200]);
  assert.equal(state.players[0].allIn, true);
  state = act(state, ['b', 'raise', 600], ['c', 'call']);
  assert.equal(state.street, 'flop');
  state = act(state, ['b', 'check'], ['c', 'check'], ['b', 'check'], ['c', 'check'], ['b', 'check'], ['c', 'check']);
  assert.equal(state.handOver, true);
  assert.deepEqual(state.payouts.find((payout) => payout.id === 'a'), { id: 'a', amount: 600 });
  const total = Object.values(chips(state)).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 2200);
});

test('an uncalled all-in bet comes back', () => {
  let state = game(['a', 'b'], 'As Ad Kc Kd 9s 2h 5c 8d 3s Jh 4c');
  state = { ...state, players: state.players.map((player) => (player.id === 'b' ? { ...player, chips: 30 } : player)) };
  state = act(state, ['a', 'raise', 500], ['b', 'call']);
  assert.equal(state.handOver, true);
  assert.equal(potTotal(state.players) > 0, true);
  const total = Object.values(chips(state)).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 1000 + 50);
  assert.equal(chips(state).b, 0);
  assert.equal(state.over, true);
  assert.deepEqual(state.winners, ['a']);
});

test('the next hand moves the dealer and deals again', () => {
  let state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  state = act(state, ['a', 'fold'], ['b', 'fold']);
  assert.equal(state.handOver, true);
  assert.deepEqual(actPoker(state, 'a', { type: 'call' }), { ok: false, reason: 'hand-over' });
  state = actPoker(state, 'b', { type: 'next-hand' }, { random: () => 0.3 }).state;
  assert.equal(state.hand, 2);
  assert.equal(state.dealer, 1);
  assert.equal(state.handOver, false);
  assert.ok(state.players.every((player) => player.cards.length === 2));
});

test('each player only sees their own cards until the showdown', () => {
  let state = game(['a', 'b'], 'As Ad Kc Kd 9s 2h 5c 8d 3s Jh 4c');
  const seen = viewPoker(state, 'a');
  assert.deepEqual(seen.players[0].cards, ['As', 'Ad']);
  assert.deepEqual(seen.players[1].cards, [null, null]);
  assert.equal(seen.deck, undefined);
  assert.deepEqual(viewPoker(state, 'watcher').players[0].cards, [null, null]);
  state = act(state, ['a', 'call'], ['b', 'check']);
  for (let street = 0; street < 3; street += 1) state = act(state, ['b', 'check'], ['a', 'check']);
  assert.deepEqual(viewPoker(state, 'watcher').players[1].cards, ['Kc', 'Kd']);
});

test('a folded hand stays hidden even after the showdown', () => {
  let state = game(['a', 'b', 'c'], 'As Ad Kc Kd 7h 2s 9s 2h 5c 8d 3s Jh 4c');
  state = act(state, ['a', 'call'], ['b', 'fold'], ['c', 'check']);
  for (let street = 0; street < 3; street += 1) state = act(state, ['c', 'check'], ['a', 'check']);
  assert.deepEqual(viewPoker(state, 'c').players[1].cards, [null, null]);
});

test('leaving folds your hand and passes the turn', () => {
  let state = game(['a', 'b', 'c'], 'As Kd 2c 2d 7h 7s');
  state = leavePoker(state, 'a');
  assert.equal(state.players[0].left, true);
  assert.equal(state.toAct, 1);
  state = leavePoker(state, 'c');
  assert.equal(state.handOver, true);
  assert.equal(state.over, true);
  assert.deepEqual(state.winners, ['b']);
});

test('leaving out of turn keeps the turn where it was', () => {
  let state = game(['a', 'b', 'c', 'd'], 'As Kd 2c 2d 7h 7s 8h 8s');
  assert.equal(state.toAct, 3);
  state = leavePoker(state, 'b');
  assert.equal(state.toAct, 3);
  assert.equal(state.over, false);
});

test('chips are never made or lost over many random hands', () => {
  let random = 7;
  const next = () => {
    random = (random * 16807) % 2147483647;
    return random / 2147483647;
  };
  let state = startPoker(['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })), { random: next });
  for (let step = 0; step < 4000 && !state.over; step += 1) {
    if (state.handOver) {
      state = actPoker(state, state.players.find((player) => !player.left).id, { type: 'next-hand' }, { random: next }).state;
      continue;
    }
    const player = state.players[state.toAct];
    const owed = state.currentBet - player.bet;
    const roll = next();
    let action;
    if (roll < 0.15 && owed > 0) action = { type: 'fold' };
    else if (roll < 0.3) action = { type: 'raise', to: Math.min(player.bet + player.chips, state.currentBet + state.minRaise + Math.floor(next() * 100)) };
    else action = owed > 0 ? { type: 'call' } : { type: 'check' };
    let result = actPoker(state, player.id, action, { random: next });
    if (!result.ok) result = actPoker(state, player.id, owed > 0 ? { type: 'call' } : { type: 'check' }, { random: next });
    assert.ok(result.ok, result.reason);
    state = result.state;
    const total = state.players.reduce((sum, item) => sum + item.chips + (state.handOver ? 0 : item.total), 0);
    assert.equal(total, 4000);
  }
  assert.equal(state.over, true);
  assert.equal(state.winners.length, 1);
  assert.equal(state.players.find((player) => player.id === state.winners[0]).chips, 4000);
});
