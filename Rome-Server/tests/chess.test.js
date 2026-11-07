import assert from 'node:assert/strict';
import { test } from 'node:test';
import { START_FEN, actChess, fromFen, leaveChess, legalMoves, makeMove, startChess, toFen } from '../../shared/games/chess.js';

function perft(position, depth) {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const move of legalMoves(position)) nodes += depth === 1 ? 1 : perft(makeMove(position, move), depth - 1);
  return nodes;
}

// Known move counts from the standard perft test positions.
const PERFT = [
  ['the starting position', START_FEN, [20, 400, 8902]],
  ['Kiwipete, full of castling and pins', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['an endgame with en passant traps', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['promotions and checks', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['a busy middlegame', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];

for (const [name, fen, counts] of PERFT) {
  test(`move counts match the published numbers for ${name}`, () => {
    const position = fromFen(fen);
    counts.forEach((expected, index) => assert.equal(perft(position, index + 1), expected, `depth ${index + 1}`));
  });
}

test('positions read and write back the same', () => {
  for (const [, fen] of PERFT) assert.equal(toFen(fromFen(fen)), fen);
});

const PLAYERS = [{ id: 'a', name: 'Ann' }, { id: 'b', name: 'Bo' }];

function game(fen) {
  const state = startChess(PLAYERS, { random: () => 0.1, fen });
  const white = state.players.find((player) => player.color === 'w').id;
  const black = state.players.find((player) => player.color === 'b').id;
  return { state, white, black };
}

function moves(state, ...list) {
  let current = state;
  for (const [player, from, to, promotion] of list) {
    const result = actChess(current, player, { type: 'move', from, to, promotion });
    assert.ok(result.ok, `${from}-${to} failed: ${result.reason}`);
    current = result.state;
  }
  return current;
}

test('white moves first, and only on its turn', () => {
  const { state, white, black } = game();
  assert.equal(state.players[0].color, 'w');
  assert.deepEqual(actChess(state, black, { type: 'move', from: 'e7', to: 'e5' }), { ok: false, reason: 'not-your-turn' });
  assert.deepEqual(actChess(state, white, { type: 'move', from: 'e2', to: 'e5' }), { ok: false, reason: 'illegal-move' });
  assert.deepEqual(actChess(state, white, { type: 'move', from: 'z9', to: 'e4' }), { ok: false, reason: 'illegal-move' });
  assert.deepEqual(actChess(state, 'c', { type: 'move', from: 'e2', to: 'e4' }), { ok: false, reason: 'not-playing' });
});

test("fool's mate ends the game for black", () => {
  const { state, white, black } = game();
  const end = moves(state, [white, 'f2', 'f3'], [black, 'e7', 'e5'], [white, 'g2', 'g4'], [black, 'd8', 'h4']);
  assert.equal(end.over, true);
  assert.deepEqual(end.result, { winner: black, reason: 'checkmate' });
  assert.deepEqual(end.moves, ['f3', 'e5', 'g4', 'Qh4#']);
  assert.deepEqual(actChess(end, white, { type: 'move', from: 'a2', to: 'a3' }), { ok: false, reason: 'over' });
});

test('stalemate is a draw', () => {
  const { state: trap, white: w } = game('7k/8/5QK1/8/8/8/8/8 w - - 0 1');
  const stalemate = moves(trap, [w, 'f6', 'f7']);
  assert.deepEqual(stalemate.result, { winner: null, reason: 'stalemate' });
});

test('castling, en passant, and promotion are recorded properly', () => {
  const { state, white, black } = game('r3k2r/pppp1ppp/8/4P3/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
  let next = moves(state, [white, 'e1', 'g1'], [black, 'd7', 'd5'], [white, 'e5', 'd6'], [black, 'e8', 'c8']);
  assert.deepEqual(next.moves, ['O-O', 'd5', 'exd6', 'O-O-O']);
  assert.equal(next.position.board[6], 'K');
  assert.equal(next.position.board[5], 'R');
  assert.equal(next.position.board[59], 'r');
  const { state: pawn, white: w } = game('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  const knight = moves(pawn, [w, 'a7', 'a8', 'n']);
  assert.equal(knight.position.board[56], 'N');
  assert.deepEqual(knight.moves, ['a8=N']);
  const queen = moves(pawn, [w, 'a7', 'a8']);
  assert.equal(queen.position.board[56], 'Q');
});

test('moves that share a square are told apart', () => {
  const { state, white } = game('k7/8/8/8/8/8/8/KN3N2 w - - 0 1');
  assert.deepEqual(moves(state, [white, 'b1', 'd2']).moves, ['Nbd2']);
});

test('a lone king against a king is a draw', () => {
  const { state, white } = game('k7/8/8/8/8/8/1q6/K7 w - - 0 1');
  const end = moves(state, [white, 'a1', 'b2']);
  assert.deepEqual(end.result, { winner: null, reason: 'material' });
});

test('the same position three times is a draw', () => {
  const { state, white, black } = game();
  const shuffle = [[white, 'g1', 'f3'], [black, 'g8', 'f6'], [white, 'f3', 'g1'], [black, 'f6', 'g8']];
  const end = moves(state, ...shuffle, ...shuffle);
  assert.deepEqual(end.result, { winner: null, reason: 'repetition' });
});

test('fifty moves without a capture or pawn move is a draw', () => {
  const { state, white } = game('k7/8/8/8/8/8/8/K6R w - - 99 80');
  assert.deepEqual(moves(state, [white, 'h1', 'h2']).result, { winner: null, reason: 'fifty-moves' });
});

test('draws can be offered, declined, and accepted, and anyone can resign', () => {
  const { state, white, black } = game();
  let next = actChess(state, white, { type: 'offer-draw' }).state;
  assert.equal(next.drawOffer, white);
  assert.deepEqual(actChess(next, white, { type: 'accept-draw' }), { ok: false, reason: 'no-draw-offer' });
  next = actChess(next, black, { type: 'decline-draw' }).state;
  assert.equal(next.drawOffer, null);
  next = actChess(next, black, { type: 'offer-draw' }).state;
  const moved = moves(next, [white, 'e2', 'e4']);
  assert.equal(moved.drawOffer, null);
  next = actChess(moved, black, { type: 'offer-draw' }).state;
  assert.deepEqual(actChess(next, white, { type: 'accept-draw' }).state.result, { winner: null, reason: 'agreed' });
  assert.deepEqual(actChess(state, black, { type: 'resign' }).state.result, { winner: white, reason: 'resigned', by: black });
});

test('leaving the table loses the game', () => {
  const { state, white, black } = game();
  const end = leaveChess(state, white);
  assert.deepEqual(end.result, { winner: black, reason: 'left', by: white });
  assert.equal(leaveChess(end, black), end);
});
