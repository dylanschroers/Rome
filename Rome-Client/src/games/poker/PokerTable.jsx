import { useEffect, useState } from 'react'
import { bestHand, potTotal } from '@shared/games/poker.js'

const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_NAMES = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }
const RANK_NAMES = { T: '10', J: 'jack', Q: 'queen', K: 'king', A: 'ace' }
const TEXT = '︎'

const chips = (value) => value.toLocaleString('en-US')
const cardName = (card) => `${RANK_NAMES[card[0]] || card[0]} of ${SUIT_NAMES[card[1]]}`

function Card({ card, small, highlight }) {
  if (!card) return <span className={`poker-card is-back${small ? ' is-small' : ''}`} role="img" aria-label="Face-down card" />
  const red = card[1] === 'h' || card[1] === 'd'
  return (
    <span className={`poker-card${red ? ' is-red' : ''}${small ? ' is-small' : ''}${highlight ? ' is-best' : ''}`} role="img" aria-label={cardName(card)}>
      <span className="poker-rank" aria-hidden="true">{card[0] === 'T' ? '10' : card[0]}</span>
      <span className="poker-suit" aria-hidden="true">{SUITS[card[1]]}{TEXT}</span>
    </span>
  )
}

function lastText(game, nameOf) {
  const { last } = game
  if (!last) return ''
  const who = last.playerId ? nameOf(last.playerId) : last.name
  const allIn = last.allIn ? ' and is all in' : ''
  switch (last.kind) {
    case 'deal': return `Hand ${last.hand}. Blinds ${chips(game.blinds.small)} and ${chips(game.blinds.big)}.`
    case 'fold': return `${who} folds.`
    case 'check': return `${who} checks.`
    case 'call': return `${who} calls${allIn}.`
    case 'bet': return `${who} bets ${chips(last.amount)}${allIn}.`
    case 'raise': return `${who} raises to ${chips(last.amount)}${allIn}.`
    case 'flop': return 'The flop.'
    case 'turn': return 'The turn.'
    case 'river': return 'The river.'
    case 'left': return `${last.name} left the table.`
    default: return ''
  }
}

function payoutText(game, nameOf) {
  if (!game.handOver || !game.payouts.length) return ''
  const hands = new Map((game.showdown || []).map((entry) => [entry.id, entry.hand]))
  return game.payouts.map(({ id, amount }) => `${nameOf(id)} wins ${chips(amount)}${hands.get(id) ? ` with ${hands.get(id).toLowerCase()}` : ''}`).join('. ') + '.'
}

function Seat({ player, seat, game, me, nameOf }) {
  const turn = !game.handOver && game.toAct === seat
  const shown = game.showdown?.find((entry) => entry.id === player.id)
  const best = new Set(shown?.best || [])
  const tags = []
  if (seat === game.dealer && !player.out) tags.push('dealer')
  if (!game.handOver && seat === game.smallBlindSeat) tags.push('small blind')
  if (!game.handOver && seat === game.bigBlindSeat) tags.push('big blind')
  const state = player.left ? 'left' : player.out ? 'out' : player.folded ? 'folded' : player.allIn ? 'all in' : ''
  const won = game.payouts.find((payout) => payout.id === player.id)

  return (
    <li className={`poker-seat${turn ? ' is-turn' : ''}${player.folded || player.out ? ' is-folded' : ''}${player.id === me ? ' is-me' : ''}${won ? ' is-won' : ''}`}>
      <div className="poker-seat-head">
        <span className="poker-seat-name">{nameOf(player.id)}{player.id === me && ' (you)'}</span>
        {tags.map((tag) => <span key={tag} className="farkle-tag">{tag}</span>)}
      </div>
      <div className="poker-seat-cards">
        {!player.out && player.cards.map((card, index) => <Card key={index} card={card} small={player.id !== me} highlight={best.has(card)} />)}
      </div>
      <div className="poker-seat-money">
        <span className="poker-stack">{chips(player.chips)}</span>
        {player.bet > 0 && <span className="poker-bet">bet {chips(player.bet)}</span>}
        {state && <span className="poker-state">{state}</span>}
        {won && <span className="poker-won">+{chips(won.amount)}</span>}
      </div>
      {shown && <p className="poker-hand-name">{shown.hand}</p>}
    </li>
  )
}

export default function PokerTable({ game, me, nameOf, busy, canPlayAgain, onAct, onPlayAgain }) {
  const seat = game.players.findIndex((player) => player.id === me)
  const mine = game.players[seat]
  const myTurn = !game.over && !game.handOver && game.toAct === seat
  const owed = mine ? Math.max(0, game.currentBet - mine.bet) : 0
  const allInTo = mine ? mine.bet + mine.chips : 0
  const minTo = Math.min(allInTo, game.currentBet + game.minRaise)
  const [raiseTo, setRaiseTo] = useState(minTo)
  const pot = potTotal(game.players)

  useEffect(() => {
    setRaiseTo(minTo)
  }, [minTo, game.toAct, game.street])

  const canRaise = myTurn && allInTo > game.currentBet
  const amount = Math.min(allInTo, Math.max(minTo, Number(raiseTo) || minTo))
  const preset = (value) => setRaiseTo(Math.min(allInTo, Math.max(minTo, Math.round(value))))
  const myHand = mine && mine.cards.every(Boolean) && game.board.length >= 3 && !mine.folded ? bestHand([...mine.cards, ...game.board]).name : ''
  const toActName = game.toAct !== null && game.players[game.toAct] ? nameOf(game.players[game.toAct].id) : ''
  const showdownBest = new Set((game.showdown || []).flatMap((entry) => (game.payouts.some((payout) => payout.id === entry.id) ? entry.best : [])))
  const status = game.over
    ? game.winners.length
      ? `${game.winners.map(nameOf).join(' and ')} ${game.winners.length > 1 ? 'share' : 'wins'} the game!`
      : 'The game is over.'
    : game.handOver ? payoutText(game, nameOf) : lastText(game, nameOf)

  return (
    <div className="poker">
      <ul className="poker-seats" aria-label="Players">
        {game.players.map((player, index) => (
          <Seat key={player.id} player={player} seat={index} game={game} me={me} nameOf={nameOf} />
        ))}
      </ul>

      <div className="poker-felt">
        <div className="poker-board" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => (
            game.board[index]
              ? <Card key={index} card={game.board[index]} highlight={showdownBest.has(game.board[index])} />
              : <span key={index} className="poker-card is-empty" aria-hidden="true" />
          ))}
        </div>
        <p className="poker-pot">Pot {chips(pot)}</p>
      </div>

      <p className="farkle-status" role="status" aria-live="polite">{status}</p>
      {myHand && !game.handOver && <p className="poker-my-hand">You have: {myHand}</p>}

      {!game.handOver && !myTurn && toActName && <p className="farkle-prompt poker-waiting">Waiting for {toActName}…</p>}
      {!mine && !game.over && <p className="farkle-watching">You're watching. You'll be dealt in next game.</p>}
      {mine?.out && !mine.left && !game.over && <p className="farkle-watching">You're out of chips for this game.</p>}

      {myTurn && (
        <div className="poker-actions">
          <div className="farkle-actions">
            <button type="button" className="farkle-button" disabled={busy} onClick={() => onAct({ type: 'fold' })}>Fold</button>
            {owed > 0 ? (
              <button type="button" className="farkle-button is-main" disabled={busy} onClick={() => onAct({ type: 'call' })}>
                {owed >= mine.chips ? `Call all in (${chips(mine.chips)})` : `Call ${chips(owed)}`}
              </button>
            ) : (
              <button type="button" className="farkle-button is-main" disabled={busy} onClick={() => onAct({ type: 'check' })}>Check</button>
            )}
          </div>
          {canRaise && (
            <div className="poker-raise">
              <label className="poker-raise-label" htmlFor="poker-raise-amount">{game.currentBet === 0 ? 'Bet' : 'Raise to'}</label>
              <input
                id="poker-raise-amount"
                className="poker-raise-slider"
                type="range"
                min={minTo}
                max={allInTo}
                step={Math.max(1, game.blinds.small)}
                value={amount}
                onChange={(event) => setRaiseTo(Number(event.target.value))}
              />
              <input
                className="poker-raise-number"
                type="number"
                aria-label="Amount"
                min={minTo}
                max={allInTo}
                value={raiseTo}
                onChange={(event) => setRaiseTo(event.target.value)}
              />
              <div className="poker-presets">
                <button type="button" onClick={() => preset(minTo)}>Min</button>
                <button type="button" onClick={() => preset(game.currentBet + pot / 2)}>½ pot</button>
                <button type="button" onClick={() => preset(game.currentBet + pot)}>Pot</button>
                <button type="button" onClick={() => preset(allInTo)}>All in</button>
              </div>
              <button
                type="button"
                className="farkle-button is-main"
                disabled={busy}
                onClick={() => onAct({ type: 'raise', to: amount })}
              >
                {amount === allInTo ? `All in (${chips(allInTo)})` : `${game.currentBet === 0 ? 'Bet' : 'Raise to'} ${chips(amount)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {game.handOver && !game.over && mine && !mine.left && (
        <div className="farkle-actions">
          <button type="button" className="farkle-button is-main" disabled={busy} onClick={() => onAct({ type: 'next-hand' })}>Deal next hand</button>
        </div>
      )}

      {game.over && (
        <div className="farkle-actions">
          <button type="button" className="farkle-button is-main" disabled={busy || !canPlayAgain} onClick={onPlayAgain}>Play again</button>
          {!canPlayAgain && <p className="farkle-watching">Needs 2 to 4 players at the table.</p>}
        </div>
      )}

      <details className="farkle-help">
        <summary>How to play</summary>
        <ul>
          <li>Everyone starts with {chips(1000)} chips. Blinds start at 10 and 20 and double every 8 hands</li>
          <li>You get two cards only you can see. Five shared cards come out over the flop, turn, and river</li>
          <li>Each round, fold, check or call to match the bet, or raise it. Last player standing, or the best five-card hand at the end, wins the pot</li>
          <li>Hands from best to worst: straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, pair, high card</li>
          <li>Play until one player has all the chips</li>
        </ul>
      </details>
    </div>
  )
}
