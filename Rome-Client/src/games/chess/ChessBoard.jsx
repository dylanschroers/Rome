import { useEffect, useMemo, useRef, useState } from 'react'
import { legalMoves, squareIndex, squareName } from '@shared/games/chess.js'

const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1 }
const START_COUNT = { q: 1, r: 2, b: 2, n: 2, p: 8 }
const PROMOTIONS = ['q', 'r', 'b', 'n']
const TEXT = '︎'

const colorOf = (piece) => (piece === piece.toUpperCase() ? 'w' : 'b')
const describePiece = (piece) => `${colorOf(piece) === 'w' ? 'white' : 'black'} ${NAMES[piece.toLowerCase()]}`

function Piece({ piece, small }) {
  return (
    <span className={`chess-piece is-${colorOf(piece)}${small ? ' is-small' : ''}`} aria-hidden="true">
      {GLYPHS[piece.toLowerCase()]}{TEXT}
    </span>
  )
}

function captured(board, color) {
  const left = { q: 0, r: 0, b: 0, n: 0, p: 0 }
  for (const piece of board) {
    if (piece && colorOf(piece) === color && piece.toLowerCase() !== 'k') left[piece.toLowerCase()] += 1
  }
  return Object.keys(START_COUNT).flatMap((kind) => Array(Math.max(0, START_COUNT[kind] - left[kind])).fill(color === 'w' ? kind.toUpperCase() : kind))
}

const material = (pieces) => pieces.reduce((sum, piece) => sum + VALUES[piece.toLowerCase()], 0)

function resultText(game, nameOf) {
  const { result } = game
  if (!result) return ''
  const winner = result.winner ? nameOf(result.winner) : null
  switch (result.reason) {
    case 'checkmate': return `Checkmate. ${winner} wins.`
    case 'resigned': return `${nameOf(result.by)} resigned. ${winner} wins.`
    case 'left': return `${nameOf(result.by)} left the table. ${winner} wins.`
    case 'stalemate': return 'Stalemate. The game is a draw.'
    case 'repetition': return 'The same position came up three times. The game is a draw.'
    case 'fifty-moves': return 'Fifty moves without a capture or pawn move. The game is a draw.'
    case 'material': return "Neither side has enough pieces left to mate. It's a draw."
    case 'agreed': return 'Draw agreed.'
    default: return 'The game is over.'
  }
}

function PlayerBar({ player, nameOf, toMove, taken, advantage, me }) {
  if (!player) return null
  return (
    <div className={`chess-player${toMove ? ' is-to-move' : ''}`}>
      <span className={`chess-swatch is-${player.color}`} aria-hidden="true" />
      <span className="chess-player-name">
        {nameOf(player.id)}
        {player.id === me && ' (you)'}
      </span>
      {toMove && <span className="farkle-tag">to move</span>}
      <span className="chess-taken" aria-label={taken.length ? `Has taken ${taken.length} pieces` : undefined}>
        {taken.map((piece, index) => <Piece key={index} piece={piece} small />)}
        {advantage > 0 && <span className="chess-advantage">+{advantage}</span>}
      </span>
    </div>
  )
}

export default function ChessBoard({ game, me, nameOf, busy, canPlayAgain, onAct, onPlayAgain }) {
  const { position } = game
  const mine = game.players.find((player) => player.id === me)
  const flipped = mine?.color === 'b'
  const myTurn = !game.over && mine?.color === position.turn
  const [selected, setSelected] = useState(null)
  const [promotion, setPromotion] = useState(null)
  const [focus, setFocus] = useState(flipped ? 'e7' : 'e2')
  const [confirmResign, setConfirmResign] = useState(false)
  const gridRef = useRef(null)

  const moves = useMemo(() => (myTurn ? legalMoves(position) : []), [myTurn, position])

  useEffect(() => {
    setSelected(null)
    setPromotion(null)
  }, [game.moves.length, game.over])

  const targets = selected === null ? [] : moves.filter((move) => move.from === selected)
  const kingInCheck = game.check ? position.board.indexOf(position.turn === 'w' ? 'K' : 'k') : -1
  const order = []
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const rank = flipped ? row : 7 - row
      const file = flipped ? 7 - column : column
      order.push(rank * 8 + file)
    }
  }

  const choose = (square) => {
    setFocus(squareName(square))
    if (!myTurn || busy) return
    const piece = position.board[square]
    const target = targets.find((move) => move.to === square)
    if (target) {
      if (target.promotion) {
        setPromotion({ from: selected, to: square })
        return
      }
      onAct({ type: 'move', from: squareName(selected), to: squareName(square) })
      return
    }
    if (piece && colorOf(piece) === mine.color && moves.some((move) => move.from === square)) setSelected(square === selected ? null : square)
    else setSelected(null)
  }

  const promote = (kind) => {
    onAct({ type: 'move', from: squareName(promotion.from), to: squareName(promotion.to), promotion: kind })
    setPromotion(null)
  }

  const onKeyDown = (event) => {
    const steps = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
    const step = steps[event.key]
    if (!step) {
      if (event.key === 'Escape') {
        setSelected(null)
        setPromotion(null)
      }
      return
    }
    event.preventDefault()
    const index = squareIndex(focus)
    const direction = flipped ? -1 : 1
    const file = Math.min(7, Math.max(0, (index % 8) + step[0] * direction))
    const rank = Math.min(7, Math.max(0, Math.floor(index / 8) + step[1] * direction))
    const next = squareName(rank * 8 + file)
    setFocus(next)
    gridRef.current?.querySelector(`[data-square="${next}"]`)?.focus()
  }

  const top = game.players.find((player) => player.color === (flipped ? 'w' : 'b'))
  const bottom = game.players.find((player) => player.color === (flipped ? 'b' : 'w'))
  const takenBy = (player) => (player ? captured(position.board, player.color === 'w' ? 'b' : 'w') : [])
  const topTaken = takenBy(top)
  const bottomTaken = takenBy(bottom)
  const lead = material(bottomTaken) - material(topTaken)
  const opponent = game.players.find((player) => player.id !== me)
  const offeredToMe = game.drawOffer && game.drawOffer !== me && mine
  const status = game.over
    ? resultText(game, nameOf)
    : game.check
      ? `Check! ${nameOf(game.players.find((player) => player.color === position.turn).id)} has to get out of it.`
      : ''
  const pairs = []
  for (let index = 0; index < game.moves.length; index += 2) pairs.push([index / 2 + 1, game.moves[index], game.moves[index + 1]])

  return (
    <div className="chess">
      <PlayerBar player={top} nameOf={nameOf} me={me} taken={topTaken} advantage={-lead} toMove={!game.over && top?.color === position.turn} />

      <div className="chess-board-wrap">
        <div ref={gridRef} className="chess-board" role="grid" aria-label="Chess board" onKeyDown={onKeyDown}>
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} role="row" className="chess-row">
              {order.slice(row * 8, row * 8 + 8).map((square) => {
                const name = squareName(square)
                const piece = position.board[square]
                const dark = (Math.floor(square / 8) + (square % 8)) % 2 === 0
                const target = targets.find((move) => move.to === square)
                const last = game.lastMove && (game.lastMove.from === name || game.lastMove.to === name)
                const classes = [
                  'chess-square',
                  dark ? 'is-dark' : 'is-light',
                  selected === square && 'is-selected',
                  last && 'is-last',
                  square === kingInCheck && 'is-check',
                  target && (piece || target.enPassant ? 'is-capture' : 'is-target'),
                ].filter(Boolean).join(' ')
                const showFile = (flipped ? Math.floor(square / 8) === 7 : Math.floor(square / 8) === 0)
                const showRank = (flipped ? square % 8 === 7 : square % 8 === 0)
                return (
                  <button
                    key={square}
                    type="button"
                    role="gridcell"
                    data-square={name}
                    className={classes}
                    tabIndex={focus === name ? 0 : -1}
                    aria-label={`${name}${piece ? `, ${describePiece(piece)}` : ''}${target ? ', can move here' : ''}${selected === square ? ', picked up' : ''}`}
                    onClick={() => choose(square)}
                  >
                    {piece && <Piece piece={piece} />}
                    {showFile && <span className="chess-coord is-file" aria-hidden="true">{name[0]}</span>}
                    {showRank && <span className="chess-coord is-rank" aria-hidden="true">{name[1]}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {promotion && (
          <div className="chess-promotion" role="dialog" aria-label="Choose a piece to promote to">
            {PROMOTIONS.map((kind) => (
              <button key={kind} type="button" className="chess-promotion-choice" aria-label={`Promote to ${NAMES[kind]}`} onClick={() => promote(kind)}>
                <Piece piece={mine.color === 'w' ? kind.toUpperCase() : kind} />
              </button>
            ))}
          </div>
        )}
      </div>

      <PlayerBar player={bottom} nameOf={nameOf} me={me} taken={bottomTaken} advantage={lead} toMove={!game.over && bottom?.color === position.turn} />

      <p className="farkle-status" role="status" aria-live="polite">{status}</p>

      {!game.over && !mine && <p className="farkle-watching">You're watching this game.</p>}
      {myTurn && !status && <p className="chess-hint">{selected === null ? 'Your move. Pick a piece.' : 'Now pick where it goes.'}</p>}

      {!game.over && mine && (
        <div className="farkle-actions">
          {offeredToMe ? (
            <>
              <span className="chess-offer">{nameOf(opponent.id)} offers a draw.</span>
              <button type="button" className="farkle-button is-main" disabled={busy} onClick={() => onAct({ type: 'accept-draw' })}>Accept draw</button>
              <button type="button" className="farkle-button" disabled={busy} onClick={() => onAct({ type: 'decline-draw' })}>Decline</button>
            </>
          ) : (
            <button type="button" className="farkle-button" disabled={busy || Boolean(game.drawOffer)} onClick={() => onAct({ type: 'offer-draw' })}>
              {game.drawOffer === me ? 'Draw offered' : 'Offer a draw'}
            </button>
          )}
          {confirmResign ? (
            <>
              <button type="button" className="farkle-button is-danger" disabled={busy} onClick={() => onAct({ type: 'resign' })}>Yes, resign</button>
              <button type="button" className="farkle-button" onClick={() => setConfirmResign(false)}>Keep playing</button>
            </>
          ) : (
            <button type="button" className="farkle-button" disabled={busy} onClick={() => setConfirmResign(true)}>Resign</button>
          )}
        </div>
      )}

      {game.over && (
        <div className="farkle-actions">
          <button type="button" className="farkle-button is-main" disabled={busy || !canPlayAgain} onClick={onPlayAgain}>Play again</button>
          {!canPlayAgain && <p className="farkle-watching">Chess needs exactly two players at the table.</p>}
        </div>
      )}

      {pairs.length > 0 && (
        <details className="farkle-help chess-moves">
          <summary>Moves ({game.moves.length})</summary>
          <ol>
            {pairs.map(([number, white, black]) => (
              <li key={number}><span className="chess-move-number">{number}.</span> {white} {black || ''}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
