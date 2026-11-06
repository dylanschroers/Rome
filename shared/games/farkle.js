export const DICE_COUNT = 6
export const TARGET_SCORE = 5000

const SINGLES = { 1: 100, 5: 50 }

function countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const face of dice) counts[face] += 1
  return counts
}

function ofAKind(face, count) {
  if (count === 3) return face === 1 ? 1000 : face * 100
  if (count === 4) return 1000
  if (count === 5) return 2000
  return 3000
}

function bestScore(counts, memo = new Map()) {
  const key = counts.join('')
  if (memo.has(key)) return memo.get(key)
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) return 0

  let best = null
  const consider = (points, rest) => {
    const restScore = bestScore(rest, memo)
    if (restScore !== null && (best === null || points + restScore > best)) best = points + restScore
  }

  if (total === DICE_COUNT) {
    const faces = counts.slice(1)
    if (faces.every((count) => count === 1)) best = Math.max(best ?? 0, 1500)
    if (faces.filter((count) => count === 2).length === 3) best = Math.max(best ?? 0, 1500)
    if (faces.filter((count) => count === 3).length === 2) best = Math.max(best ?? 0, 2500)
  }

  for (let face = 1; face <= 6; face += 1) {
    for (let count = 3; count <= counts[face]; count += 1) {
      const rest = [...counts]
      rest[face] -= count
      consider(ofAKind(face, count), rest)
    }
    if (SINGLES[face] && counts[face] > 0) {
      const rest = [...counts]
      rest[face] -= 1
      consider(SINGLES[face], rest)
    }
  }

  memo.set(key, best)
  return best
}

// The best score for a set of dice, using every die. Null if any die can't score.
export function scoreDice(dice) {
  if (!Array.isArray(dice) || dice.length === 0) return null
  if (dice.some((face) => !Number.isInteger(face) || face < 1 || face > 6)) return null
  return bestScore(countFaces(dice))
}

export function canScore(dice) {
  const counts = countFaces(dice)
  if (counts[1] > 0 || counts[5] > 0) return true
  if (counts.some((count, face) => face > 0 && count >= 3)) return true
  return scoreDice(dice) !== null
}

const rollDie = (random) => Math.min(6, Math.floor(random() * 6) + 1)
const freeIndexes = (state) => state.held.flatMap((held, index) => (held ? [] : [index]))

function rollFree(state, random) {
  const dice = state.dice.map((face, index) => (state.held[index] ? face : rollDie(random)))
  const rolled = freeIndexes(state).map((index) => dice[index])
  const next = { ...state, dice, rolled: true, rolls: state.rolls + 1 }
  if (canScore(rolled)) return next
  return passTurn({ ...next, last: { kind: 'farkle', playerId: currentPlayer(state).id, points: state.turnScore } })
}

const currentPlayer = (state) => state.players[state.turn]

function passTurn(state) {
  const endedBy = currentPlayer(state)?.id
  let lastTurns = state.lastTurns
  if (lastTurns) {
    lastTurns = lastTurns.filter((id) => id !== endedBy)
    if (lastTurns.length === 0) return finish({ ...state, lastTurns })
  }
  return {
    ...state,
    lastTurns,
    turn: (state.turn + 1) % state.players.length,
    held: Array(DICE_COUNT).fill(false),
    rolled: false,
    turnScore: 0,
  }
}

function finish(state) {
  const top = Math.max(...state.players.map((player) => player.score))
  const winners = state.players.filter((player) => player.score === top).map((player) => player.id)
  return { ...state, over: true, rolled: false, turnScore: 0, winners, last: { kind: 'win', playerId: winners[0], points: top } }
}

export function startFarkle(players, { random = Math.random, target = TARGET_SCORE } = {}) {
  return {
    game: 'farkle',
    target,
    players: players.map(({ id, name }) => ({ id, name, score: 0 })),
    turn: Math.floor(random() * players.length) % players.length,
    dice: Array(DICE_COUNT).fill(1).map(() => rollDie(random)),
    held: Array(DICE_COUNT).fill(false),
    rolled: false,
    turnScore: 0,
    rolls: 0,
    lastTurns: null,
    over: false,
    winners: [],
    last: { kind: 'start' },
  }
}

function keepDice(state, keep) {
  if (!state.rolled) return { reason: 'roll-first' }
  if (!Array.isArray(keep) || keep.length === 0) return { reason: 'keep-some' }
  const unique = [...new Set(keep)]
  if (unique.length !== keep.length) return { reason: 'bad-dice' }
  if (unique.some((index) => !Number.isInteger(index) || index < 0 || index >= DICE_COUNT || state.held[index])) {
    return { reason: 'bad-dice' }
  }
  const points = scoreDice(unique.map((index) => state.dice[index]))
  if (points === null) return { reason: 'not-scoring' }
  const held = state.held.map((value, index) => value || unique.includes(index))
  return { state: { ...state, held, turnScore: state.turnScore + points } }
}

export function actFarkle(state, playerId, action, { random = Math.random } = {}) {
  if (state.over) return { ok: false, reason: 'over' }
  if (currentPlayer(state)?.id !== playerId) return { ok: false, reason: 'not-your-turn' }
  const type = action?.type

  if (type === 'roll' && !state.rolled) {
    if (action.keep?.length) return { ok: false, reason: 'roll-first' }
    return { ok: true, state: rollFree({ ...state, last: null }, random) }
  }

  if (type === 'roll' || type === 'bank') {
    const kept = keepDice(state, action.keep)
    if (!kept.state) return { ok: false, reason: kept.reason }
    let next = kept.state

    if (type === 'bank') {
      const players = next.players.map((player, index) => (
        index === next.turn ? { ...player, score: player.score + next.turnScore } : player
      ))
      const banker = players[next.turn]
      next = { ...next, players, last: { kind: 'bank', playerId: banker.id, points: next.turnScore } }
      if (!next.lastTurns && banker.score >= next.target) {
        next = { ...next, lastTurns: players.filter((player) => player.id !== banker.id).map((player) => player.id), last: { kind: 'final-round', playerId: banker.id, points: next.turnScore } }
      }
      return { ok: true, state: passTurn(next) }
    }

    if (next.held.every(Boolean)) {
      next = { ...next, held: Array(DICE_COUNT).fill(false), last: { kind: 'hot-dice', playerId } }
    } else {
      next = { ...next, last: null }
    }
    return { ok: true, state: rollFree(next, random) }
  }

  return { ok: false, reason: 'bad-action' }
}

export function leaveFarkle(state, playerId) {
  const index = state.players.findIndex((player) => player.id === playerId)
  if (index === -1 || state.over) return state
  const players = state.players.filter((player) => player.id !== playerId)
  const lastTurns = state.lastTurns && state.lastTurns.filter((id) => id !== playerId)
  const left = { kind: 'left', playerId, name: state.players[index].name }

  if (players.length < 2) {
    return { ...state, players, lastTurns, over: true, rolled: false, turnScore: 0, winners: players.map((player) => player.id), last: { ...left, abandoned: true } }
  }

  const wasTurn = index === state.turn
  let turn = index < state.turn ? state.turn - 1 : state.turn
  if (turn >= players.length) turn = 0
  let next = { ...state, players, lastTurns, turn, last: left }
  if (wasTurn) next = { ...next, held: Array(DICE_COUNT).fill(false), rolled: false, turnScore: 0 }
  if (lastTurns && lastTurns.length === 0) return finish(next)
  return next
}

export const FARKLE = {
  id: 'farkle',
  name: 'Farkle',
  minPlayers: 2,
  maxPlayers: 4,
  start: startFarkle,
  act: actFarkle,
  leave: leaveFarkle,
}
