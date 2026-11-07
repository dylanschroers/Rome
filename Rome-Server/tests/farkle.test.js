import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DICE_COUNT, actFarkle, canScore, leaveFarkle, scoreDice, startFarkle } from '../../shared/games/farkle.js';
import { findGame } from '../../shared/games/index.js';

// Each call hands out the next die face, so every roll in a test is spelled out.
function dice(...faces) {
  let index = 0;
  return () => {
    const face = faces[index % faces.length];
    index += 1;
    return (face - 1) / 6 + 0.01;
  };
}

const PLAYERS = [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bo' }];

function begin({ target, players = PLAYERS } = {}) {
  return startFarkle(players, { random: dice(1, 1, 1, 1, 1, 1, 1), target });
}

function play(state, playerId, action, ...faces) {
  const result = actFarkle(state, playerId, action, { random: dice(...(faces.length ? faces : [2])) });
  assert.ok(result.ok, `expected ${JSON.stringify(action)} to work, got ${result.reason}`);
  return result.state;
}

test('singles: ones are 100 and fives are 50', () => {
  assert.equal(scoreDice([1]), 100);
  assert.equal(scoreDice([5]), 50);
  assert.equal(scoreDice([1, 5, 1]), 250);
});

test('three of a kind is the face times 100, and three ones are 1000', () => {
  assert.equal(scoreDice([2, 2, 2]), 200);
  assert.equal(scoreDice([6, 6, 6]), 600);
  assert.equal(scoreDice([1, 1, 1]), 1000);
});

test('four, five, and six of a kind are 1000, 2000, and 3000', () => {
  assert.equal(scoreDice([3, 3, 3, 3]), 1000);
  assert.equal(scoreDice([4, 4, 4, 4, 4]), 2000);
  assert.equal(scoreDice([2, 2, 2, 2, 2, 2]), 3000);
});

test('a straight and three pairs are 1500, two triplets are 2500', () => {
  assert.equal(scoreDice([1, 2, 3, 4, 5, 6]), 1500);
  assert.equal(scoreDice([2, 2, 3, 3, 6, 6]), 1500);
  assert.equal(scoreDice([3, 3, 3, 4, 4, 4]), 2500);
});

test('the best way to count the dice is used', () => {
  assert.equal(scoreDice([1, 1, 1, 1]), 1100);
  assert.equal(scoreDice([5, 5, 5, 5, 1]), 1100);
  assert.equal(scoreDice([1, 1, 1, 5, 5, 5]), 2500);
});

test('every kept die has to score', () => {
  assert.equal(scoreDice([1, 2]), null);
  assert.equal(scoreDice([2, 2]), null);
  assert.equal(scoreDice([]), null);
  assert.equal(scoreDice([7]), null);
  assert.equal(scoreDice(['1']), null);
});

test('a roll with nothing to keep is a farkle', () => {
  assert.equal(canScore([2, 3, 4, 6, 2, 3]), false);
  assert.equal(canScore([2, 3, 4, 6]), false);
  assert.equal(canScore([2, 2, 4, 4, 6, 6]), true);
  assert.equal(canScore([5]), true);
  assert.equal(canScore([3, 3, 3]), true);
});

test('a game starts with everyone at zero, waiting for the first roll', () => {
  const state = begin();
  assert.deepEqual(state.players.map((player) => player.score), [0, 0]);
  assert.equal(state.rolled, false);
  assert.equal(state.dice.length, DICE_COUNT);
  assert.equal(state.target, 5000);
  assert.equal(findGame('farkle').name, 'Farkle');
  assert.equal(findGame('backgammon'), null);
  assert.equal(findGame('constructor'), null);
});

test('only the player whose turn it is can act', () => {
  const state = begin();
  const other = state.players[(state.turn + 1) % 2].id;
  assert.deepEqual(actFarkle(state, other, { type: 'roll' }), { ok: false, reason: 'not-your-turn' });
  assert.deepEqual(actFarkle(state, state.players[state.turn].id, { type: 'dance' }), { ok: false, reason: 'bad-action' });
});

test('roll, keep scoring dice, roll the rest, then bank', () => {
  let state = begin();
  const me = state.players[state.turn].id;
  state = play(state, me, { type: 'roll' }, 1, 5, 2, 3, 4, 6);
  assert.deepEqual(state.dice, [1, 5, 2, 3, 4, 6]);
  assert.deepEqual(actFarkle(state, me, { type: 'bank' }), { ok: false, reason: 'keep-some' });
  assert.deepEqual(actFarkle(state, me, { type: 'bank', keep: [2] }), { ok: false, reason: 'not-scoring' });
  assert.deepEqual(actFarkle(state, me, { type: 'bank', keep: [0, 0] }), { ok: false, reason: 'bad-dice' });
  state = play(state, me, { type: 'roll', keep: [0] }, 5, 2, 3, 4, 6);
  assert.equal(state.turnScore, 100);
  assert.deepEqual(state.held, [true, false, false, false, false, false]);
  assert.equal(state.dice[0], 1);
  assert.deepEqual(actFarkle(state, me, { type: 'roll', keep: [0] }), { ok: false, reason: 'bad-dice' });
  state = play(state, me, { type: 'bank', keep: [1] });
  assert.equal(state.players.find((player) => player.id === me).score, 150);
  assert.deepEqual(state.last, { kind: 'bank', playerId: me, points: 150 });
  assert.notEqual(state.players[state.turn].id, me);
  assert.equal(state.rolled, false);
  assert.ok(state.held.every((held) => !held));
});

test('a farkle loses the points from that turn and passes the dice', () => {
  let state = begin();
  const me = state.players[state.turn].id;
  state = play(state, me, { type: 'roll' }, 1, 1, 1, 2, 3, 4);
  state = play(state, me, { type: 'roll', keep: [0, 1, 2] }, 2, 3, 4);
  assert.equal(state.last.kind, 'farkle');
  assert.equal(state.last.points, 1000);
  assert.equal(state.players.find((player) => player.id === me).score, 0);
  assert.notEqual(state.players[state.turn].id, me);
});

test('a first roll with nothing is a farkle too', () => {
  let state = begin();
  const me = state.players[state.turn].id;
  state = play(state, me, { type: 'roll' }, 2, 3, 4, 6, 2, 3);
  assert.deepEqual(state.last, { kind: 'farkle', playerId: me, points: 0 });
  assert.notEqual(state.players[state.turn].id, me);
});

test('scoring with all six dice frees them all to roll again', () => {
  let state = begin();
  const me = state.players[state.turn].id;
  state = play(state, me, { type: 'roll' }, 1, 1, 1, 5, 2, 3);
  state = play(state, me, { type: 'roll', keep: [0, 1, 2, 3] }, 1, 5);
  assert.equal(state.turnScore, 1050);
  state = play(state, me, { type: 'roll', keep: [4, 5] }, 2, 3, 4, 6, 2, 1);
  assert.equal(state.last.kind, 'hot-dice');
  assert.equal(state.turnScore, 1200);
  assert.ok(state.held.every((held) => !held));
  assert.deepEqual(state.dice, [2, 3, 4, 6, 2, 1]);
  state = play(state, me, { type: 'bank', keep: [5] });
  assert.equal(state.players.find((player) => player.id === me).score, 1300);
});

test('reaching the target gives everyone else one last turn, then the best score wins', () => {
  let state = begin({ target: 1000 });
  const first = state.players[state.turn].id;
  const second = state.players[(state.turn + 1) % 2].id;
  state = play(state, first, { type: 'roll' }, 1, 1, 1, 2, 3, 4);
  state = play(state, first, { type: 'bank', keep: [0, 1, 2] });
  assert.equal(state.last.kind, 'final-round');
  assert.deepEqual(state.lastTurns, [second]);
  assert.equal(state.over, false);
  state = play(state, second, { type: 'roll' }, 1, 1, 1, 1, 2, 3);
  state = play(state, second, { type: 'bank', keep: [0, 1, 2, 3] });
  assert.equal(state.over, true);
  assert.deepEqual(state.winners, [second]);
  assert.deepEqual(actFarkle(state, first, { type: 'roll' }), { ok: false, reason: 'over' });
});

test('a tie at the end shares the win', () => {
  let state = begin({ target: 1000 });
  const first = state.players[state.turn].id;
  const second = state.players[(state.turn + 1) % 2].id;
  state = play(state, first, { type: 'roll' }, 1, 1, 1, 2, 3, 4);
  state = play(state, first, { type: 'bank', keep: [0, 1, 2] });
  state = play(state, second, { type: 'roll' }, 1, 1, 1, 2, 3, 4);
  state = play(state, second, { type: 'bank', keep: [0, 1, 2] });
  assert.deepEqual(state.winners.sort(), ['a', 'b']);
});

test('a player leaving mid-turn passes the dice on', () => {
  const players = [...PLAYERS, { id: 'c', name: 'Cy' }];
  let state = startFarkle(players, { random: dice(1) });
  assert.equal(state.players[state.turn].id, 'a');
  state = play(state, 'a', { type: 'roll' }, 1, 2, 3, 4, 6, 6);
  state = leaveFarkle(state, 'a');
  assert.deepEqual(state.players.map((player) => player.id), ['b', 'c']);
  assert.equal(state.players[state.turn].id, 'b');
  assert.equal(state.rolled, false);
  assert.equal(state.turnScore, 0);
  assert.equal(state.last.kind, 'left');
});

test('a player leaving out of turn keeps the turn where it was', () => {
  const players = [...PLAYERS, { id: 'c', name: 'Cy' }];
  let state = startFarkle(players, { random: dice(1) });
  state = play(state, 'a', { type: 'roll' }, 2, 3, 4, 6, 2, 3);
  assert.equal(state.players[state.turn].id, 'b');
  state = leaveFarkle(state, 'a');
  assert.equal(state.players[state.turn].id, 'b');
  assert.equal(leaveFarkle(state, 'nobody'), state);
});

test('the game ends when only one player is left', () => {
  let state = begin();
  state = leaveFarkle(state, 'a');
  assert.equal(state.over, true);
  assert.equal(state.last.abandoned, true);
  assert.deepEqual(state.winners, ['b']);
});

test('the last player owed a final turn leaving ends the game', () => {
  const players = [...PLAYERS, { id: 'c', name: 'Cy' }, { id: 'd', name: 'Dee' }];
  let state = startFarkle(players, { random: dice(1), target: 100 });
  state = play(state, 'a', { type: 'roll' }, 1, 2, 3, 4, 6, 6);
  state = play(state, 'a', { type: 'bank', keep: [0] });
  assert.deepEqual(state.lastTurns, ['b', 'c', 'd']);
  state = leaveFarkle(state, 'c');
  state = leaveFarkle(state, 'd');
  assert.equal(state.over, false);
  state = leaveFarkle(state, 'b');
  assert.equal(state.over, true);
  assert.deepEqual(state.winners, ['a']);
});

test('the final turns finish the game even with players still at the table', () => {
  const players = [...PLAYERS, { id: 'c', name: 'Cy' }];
  let state = startFarkle(players, { random: dice(1), target: 100 });
  state = play(state, 'a', { type: 'roll' }, 1, 2, 3, 4, 6, 6);
  state = play(state, 'a', { type: 'bank', keep: [0] });
  state = leaveFarkle(state, 'c');
  assert.deepEqual(state.lastTurns, ['b']);
  state = play(state, 'b', { type: 'roll' }, 2, 3, 4, 6, 2, 3);
  assert.equal(state.over, true);
  assert.deepEqual(state.winners, ['a']);
});
