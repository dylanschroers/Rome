export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const FILES = 'abcdefgh'
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const PROMOTIONS = ['q', 'r', 'b', 'n']

export const squareName = (index) => `${FILES[index % 8]}${Math.floor(index / 8) + 1}`

export function squareIndex(name) {
  if (typeof name !== 'string' || !/^[a-h][1-8]$/.test(name)) return -1
  return (Number(name[1]) - 1) * 8 + FILES.indexOf(name[0])
}

const colorOf = (piece) => (piece ? (piece === piece.toUpperCase() ? 'w' : 'b') : null)
const typeOf = (piece) => piece.toLowerCase()
const other = (color) => (color === 'w' ? 'b' : 'w')
const at = (file, rank) => (file >= 0 && file < 8 && rank >= 0 && rank < 8 ? rank * 8 + file : -1)

export function fromFen(fen) {
  const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.trim().split(/\s+/)
  const board = Array(64).fill('')
  placement.split('/').forEach((row, rowIndex) => {
    const rank = 7 - rowIndex
    let file = 0
    for (const char of row) {
      if (/\d/.test(char)) file += Number(char)
      else {
        board[rank * 8 + file] = char
        file += 1
      }
    }
  })
  return {
    board,
    turn,
    castling: castling === '-' ? '' : castling,
    enPassant: enPassant === '-' ? -1 : squareIndex(enPassant),
    halfmove: Number(halfmove || 0),
    fullmove: Number(fullmove || 1),
  }
}

export function toFen(position, { counters = true } = {}) {
  const rows = []
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = ''
    let empty = 0
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board[rank * 8 + file]
      if (!piece) empty += 1
      else {
        if (empty) row += empty
        empty = 0
        row += piece
      }
    }
    rows.push(row + (empty || ''))
  }
  const parts = [rows.join('/'), position.turn, position.castling || '-', position.enPassant >= 0 ? squareName(position.enPassant) : '-']
  if (counters) parts.push(position.halfmove, position.fullmove)
  return parts.join(' ')
}

export function isAttacked(board, square, by) {
  const file = square % 8
  const rank = Math.floor(square / 8)
  const pawnRank = by === 'w' ? rank - 1 : rank + 1
  for (const df of [-1, 1]) {
    const from = at(file + df, pawnRank)
    if (from >= 0 && board[from] === (by === 'w' ? 'P' : 'p')) return true
  }
  for (const [df, dr] of KNIGHT) {
    const from = at(file + df, rank + dr)
    if (from >= 0 && board[from] === (by === 'w' ? 'N' : 'n')) return true
  }
  for (const [df, dr] of KING) {
    const from = at(file + df, rank + dr)
    if (from >= 0 && board[from] === (by === 'w' ? 'K' : 'k')) return true
  }
  const slides = [[ROOK, 'r'], [BISHOP, 'b']]
  for (const [directions, kind] of slides) {
    for (const [df, dr] of directions) {
      let f = file + df
      let r = rank + dr
      while (at(f, r) >= 0) {
        const piece = board[at(f, r)]
        if (piece) {
          if (colorOf(piece) === by && (typeOf(piece) === kind || typeOf(piece) === 'q')) return true
          break
        }
        f += df
        r += dr
      }
    }
  }
  return false
}

const kingSquare = (board, color) => board.indexOf(color === 'w' ? 'K' : 'k')

export const inCheck = (position, color = position.turn) => isAttacked(position.board, kingSquare(position.board, color), other(color))

function pseudoMoves(position) {
  const { board, turn } = position
  const moves = []
  const add = (from, to, extra = {}) => moves.push({ from, to, ...extra })

  for (let from = 0; from < 64; from += 1) {
    const piece = board[from]
    if (!piece || colorOf(piece) !== turn) continue
    const file = from % 8
    const rank = Math.floor(from / 8)
    const kind = typeOf(piece)

    if (kind === 'p') {
      const step = turn === 'w' ? 1 : -1
      const startRank = turn === 'w' ? 1 : 6
      const lastRank = turn === 'w' ? 7 : 0
      const pushTo = (to, extra = {}) => {
        if (Math.floor(to / 8) === lastRank) PROMOTIONS.forEach((promotion) => add(from, to, { ...extra, promotion }))
        else add(from, to, extra)
      }
      const one = at(file, rank + step)
      if (one >= 0 && !board[one]) {
        pushTo(one)
        const two = at(file, rank + step * 2)
        if (rank === startRank && !board[two]) add(from, two, { double: true })
      }
      for (const df of [-1, 1]) {
        const to = at(file + df, rank + step)
        if (to < 0) continue
        if (board[to] && colorOf(board[to]) !== turn) pushTo(to)
        else if (to === position.enPassant) add(from, to, { enPassant: true })
      }
      continue
    }

    if (kind === 'n' || kind === 'k') {
      for (const [df, dr] of kind === 'n' ? KNIGHT : KING) {
        const to = at(file + df, rank + dr)
        if (to >= 0 && colorOf(board[to]) !== turn) add(from, to)
      }
    }

    if (kind === 'b' || kind === 'r' || kind === 'q') {
      const directions = kind === 'b' ? BISHOP : kind === 'r' ? ROOK : [...ROOK, ...BISHOP]
      for (const [df, dr] of directions) {
        let f = file + df
        let r = rank + dr
        while (at(f, r) >= 0) {
          const to = at(f, r)
          if (board[to]) {
            if (colorOf(board[to]) !== turn) add(from, to)
            break
          }
          add(from, to)
          f += df
          r += dr
        }
      }
    }

    if (kind === 'k') {
      const home = turn === 'w' ? 4 : 60
      const enemy = other(turn)
      if (from === home && !isAttacked(board, home, enemy)) {
        const [kingSide, queenSide] = turn === 'w' ? ['K', 'Q'] : ['k', 'q']
        const rook = turn === 'w' ? 'R' : 'r'
        if (position.castling.includes(kingSide) && board[home + 3] === rook && !board[home + 1] && !board[home + 2]
          && !isAttacked(board, home + 1, enemy) && !isAttacked(board, home + 2, enemy)) {
          add(from, home + 2, { castle: 'k' })
        }
        if (position.castling.includes(queenSide) && board[home - 4] === rook && !board[home - 1] && !board[home - 2] && !board[home - 3]
          && !isAttacked(board, home - 1, enemy) && !isAttacked(board, home - 2, enemy)) {
          add(from, home - 2, { castle: 'q' })
        }
      }
    }
  }
  return moves
}

const CASTLE_RIGHTS = { 0: 'Q', 7: 'K', 4: 'KQ', 56: 'q', 63: 'k', 60: 'kq' }

export function makeMove(position, move) {
  const board = [...position.board]
  const piece = board[move.from]
  const captured = move.enPassant ? board[move.to + (position.turn === 'w' ? -8 : 8)] : board[move.to]
  board[move.to] = move.promotion ? (position.turn === 'w' ? move.promotion.toUpperCase() : move.promotion) : piece
  board[move.from] = ''
  if (move.enPassant) board[move.to + (position.turn === 'w' ? -8 : 8)] = ''
  if (move.castle === 'k') {
    board[move.from + 1] = board[move.from + 3]
    board[move.from + 3] = ''
  }
  if (move.castle === 'q') {
    board[move.from - 1] = board[move.from - 4]
    board[move.from - 4] = ''
  }

  let { castling } = position
  for (const square of [move.from, move.to]) {
    if (CASTLE_RIGHTS[square]) castling = castling.replace(new RegExp(`[${CASTLE_RIGHTS[square]}]`, 'g'), '')
  }

  return {
    board,
    turn: other(position.turn),
    castling,
    enPassant: move.double ? (move.from + move.to) / 2 : -1,
    halfmove: typeOf(piece) === 'p' || captured ? 0 : position.halfmove + 1,
    fullmove: position.fullmove + (position.turn === 'b' ? 1 : 0),
  }
}

export function legalMoves(position) {
  return pseudoMoves(position).filter((move) => !inCheck(makeMove(position, move), position.turn))
}

function insufficientMaterial(board) {
  const pieces = board.map((piece, square) => ({ piece, square })).filter(({ piece }) => piece && typeOf(piece) !== 'k')
  if (pieces.length === 0) return true
  if (pieces.length === 1 && ['b', 'n'].includes(typeOf(pieces[0].piece))) return true
  if (pieces.every(({ piece }) => typeOf(piece) === 'b')) {
    const shades = new Set(pieces.map(({ square }) => (Math.floor(square / 8) + (square % 8)) % 2))
    return shades.size === 1
  }
  return false
}

export function toSan(position, move) {
  if (move.castle) return move.castle === 'k' ? 'O-O' : 'O-O-O'
  const piece = position.board[move.from]
  const kind = typeOf(piece)
  const capture = Boolean(position.board[move.to]) || move.enPassant
  let san = ''
  if (kind === 'p') {
    if (capture) san += FILES[move.from % 8]
  } else {
    san += kind.toUpperCase()
    const rivals = legalMoves(position).filter((other) => (
      other.to === move.to && other.from !== move.from && position.board[other.from] === piece
    ))
    if (rivals.length) {
      const sameFile = rivals.some((rival) => rival.from % 8 === move.from % 8)
      const sameRank = rivals.some((rival) => Math.floor(rival.from / 8) === Math.floor(move.from / 8))
      if (!sameFile) san += FILES[move.from % 8]
      else if (!sameRank) san += Math.floor(move.from / 8) + 1
      else san += squareName(move.from)
    }
  }
  if (capture) san += 'x'
  san += squareName(move.to)
  if (move.promotion) san += `=${move.promotion.toUpperCase()}`
  const after = makeMove(position, move)
  if (inCheck(after)) san += legalMoves(after).length ? '+' : '#'
  return san
}

const repetitionKey = (position) => toFen(position, { counters: false })

function judge(state) {
  const { position } = state
  const moves = legalMoves(position)
  const mover = state.players.find((player) => player.color === other(position.turn))
  if (moves.length === 0) {
    if (inCheck(position)) return { winner: mover.id, reason: 'checkmate' }
    return { winner: null, reason: 'stalemate' }
  }
  if (position.halfmove >= 100) return { winner: null, reason: 'fifty-moves' }
  if ((state.seen[repetitionKey(position)] || 0) >= 3) return { winner: null, reason: 'repetition' }
  if (insufficientMaterial(position.board)) return { winner: null, reason: 'material' }
  return null
}

function end(state, result) {
  return { ...state, over: true, result, drawOffer: null, winners: result.winner ? [result.winner] : [] }
}

export function startChess(players, { random = Math.random, fen = START_FEN } = {}) {
  const whiteFirst = random() < 0.5
  const [white, black] = whiteFirst ? players : [players[1], players[0]]
  const position = fromFen(fen)
  return {
    game: 'chess',
    players: [
      { id: white.id, name: white.name, color: 'w' },
      { id: black.id, name: black.name, color: 'b' },
    ],
    position,
    check: inCheck(position),
    moves: [],
    lastMove: null,
    seen: { [repetitionKey(position)]: 1 },
    drawOffer: null,
    over: false,
    result: null,
    winners: [],
  }
}

export function actChess(state, playerId, action) {
  if (state.over) return { ok: false, reason: 'over' }
  const player = state.players.find((item) => item.id === playerId)
  if (!player) return { ok: false, reason: 'not-playing' }
  const opponent = state.players.find((item) => item.id !== playerId)

  switch (action?.type) {
    case 'move': {
      if (state.position.turn !== player.color) return { ok: false, reason: 'not-your-turn' }
      const from = squareIndex(action.from)
      const to = squareIndex(action.to)
      const candidates = legalMoves(state.position).filter((move) => move.from === from && move.to === to)
      if (!candidates.length) return { ok: false, reason: 'illegal-move' }
      const promotion = candidates[0].promotion ? (PROMOTIONS.includes(action.promotion) ? action.promotion : 'q') : undefined
      const move = candidates.find((item) => item.promotion === promotion) || candidates[0]
      const san = toSan(state.position, move)
      const position = makeMove(state.position, move)
      const key = repetitionKey(position)
      const next = {
        ...state,
        position,
        check: inCheck(position),
        moves: [...state.moves, san],
        lastMove: { from: squareName(move.from), to: squareName(move.to) },
        seen: { ...state.seen, [key]: (state.seen[key] || 0) + 1 },
        drawOffer: state.drawOffer === opponent.id ? null : state.drawOffer,
      }
      const result = judge(next)
      return { ok: true, state: result ? end(next, result) : next }
    }
    case 'resign':
      return { ok: true, state: end(state, { winner: opponent.id, reason: 'resigned', by: playerId }) }
    case 'offer-draw':
      if (state.drawOffer) return { ok: false, reason: 'draw-offered' }
      return { ok: true, state: { ...state, drawOffer: playerId } }
    case 'accept-draw':
      if (state.drawOffer !== opponent.id) return { ok: false, reason: 'no-draw-offer' }
      return { ok: true, state: end(state, { winner: null, reason: 'agreed' }) }
    case 'decline-draw':
      if (state.drawOffer !== opponent.id) return { ok: false, reason: 'no-draw-offer' }
      return { ok: true, state: { ...state, drawOffer: null } }
    default:
      return { ok: false, reason: 'bad-action' }
  }
}

export function leaveChess(state, playerId) {
  if (state.over || !state.players.some((player) => player.id === playerId)) return state
  const opponent = state.players.find((player) => player.id !== playerId)
  return end(state, { winner: opponent.id, reason: 'left', by: playerId })
}

export const CHESS = {
  id: 'chess',
  name: 'Chess',
  minPlayers: 2,
  maxPlayers: 2,
  start: startChess,
  act: actChess,
  leave: leaveChess,
}
