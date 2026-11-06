import { useEffect, useState } from 'react'
import { scoreDice } from '@shared/games/farkle.js'

const PIPS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

const points = (value) => value.toLocaleString('en-US')

function Die({ face, held, selected, selectable, rolling, onToggle }) {
  const label = `Die showing ${face}${held ? ', set aside' : selected ? ', picked' : ''}`
  const pips = (
    <span className="farkle-pips" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={PIPS[face].includes(index + 1) ? 'is-on' : ''} />
      ))}
    </span>
  )
  const className = `farkle-die${held ? ' is-held' : ''}${selected ? ' is-selected' : ''}${rolling ? ' is-rolling' : ''}`

  if (!selectable) return <span className={className} role="img" aria-label={label}>{pips}</span>
  return (
    <button type="button" className={className} aria-pressed={selected} aria-label={label} onClick={onToggle}>
      {pips}
    </button>
  )
}

function describe(last, nameOf, game) {
  if (!last) return ''
  const name = last.playerId ? nameOf(last.playerId) : last.name
  switch (last.kind) {
    case 'start':
      return `${nameOf(game.players[game.turn].id)} goes first. First to ${points(game.target)} wins.`
    case 'farkle':
      return last.points > 0 ? `${name} farkled and lost ${points(last.points)}.` : `${name} farkled.`
    case 'bank':
      return `${name} banked ${points(last.points)}.`
    case 'hot-dice':
      return `Hot dice! ${name} scored with all six, so they're all back in play.`
    case 'final-round':
      return `${name} banked ${points(last.points)} and reached ${points(game.target)}. Everyone else gets one last turn.`
    case 'left':
      return last.abandoned ? `${last.name} left, so the game is over.` : `${last.name} left the game.`
    case 'win':
      return game.winners.length > 1
        ? `It's a tie at ${points(last.points)} between ${game.winners.map(nameOf).join(' and ')}.`
        : `${name} wins with ${points(last.points)}!`
    default:
      return ''
  }
}

export default function FarkleBoard({ game, me, nameOf, busy, canPlayAgain, onAct, onPlayAgain }) {
  const [picked, setPicked] = useState([])
  const current = game.players[game.turn]
  const myTurn = !game.over && current?.id === me
  const playing = game.players.some((player) => player.id === me)

  useEffect(() => {
    setPicked([])
  }, [game.rolls, game.turn, game.over])

  const pickedFaces = picked.map((index) => game.dice[index])
  const preview = picked.length ? scoreDice(pickedFaces) : null
  const freeLeft = game.held.filter((held) => !held).length - picked.length
  const nextRoll = freeLeft === 0 ? 6 : freeLeft
  const status = describe(game.last, nameOf, game)

  const toggle = (index) => {
    setPicked((previous) => (previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index].sort()))
  }

  let prompt
  if (game.over) prompt = null
  else if (myTurn && !game.rolled) prompt = game.turnScore ? 'Roll the rest of the dice.' : 'Your turn. Roll the dice.'
  else if (myTurn) prompt = picked.length && preview === null ? "Those dice don't score together." : 'Pick the dice you want to keep.'
  else prompt = `${nameOf(current.id)} is ${game.rolled ? 'choosing dice' : 'about to roll'}…`

  return (
    <div className="farkle">
      <ol className="farkle-scores" aria-label="Scores">
        {game.players.map((player) => {
          const turn = !game.over && player.id === current.id
          const won = game.over && game.winners.includes(player.id)
          return (
            <li key={player.id} className={`farkle-player${turn ? ' is-turn' : ''}${won ? ' is-winner' : ''}${player.id === me ? ' is-me' : ''}`}>
              <span className="farkle-player-name">
                <span className="farkle-player-label">
                  {nameOf(player.id)}
                  {player.id === me && ' (you)'}
                </span>
                {turn && <span className="farkle-tag">rolling</span>}
                {won && <span className="farkle-tag is-gold">winner</span>}
              </span>
              <span className="farkle-player-score">{points(player.score)}</span>
              <span className="farkle-progress" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (player.score / game.target) * 100)}%` }} />
              </span>
            </li>
          )
        })}
      </ol>

      <div className="farkle-dice" key={game.rolls}>
        {game.dice.map((face, index) => (
          <Die
            key={index}
            face={face}
            held={game.held[index]}
            selected={picked.includes(index)}
            selectable={myTurn && game.rolled && !game.held[index]}
            rolling={game.rolls > 0 && !game.held[index] && !game.over}
            onToggle={() => toggle(index)}
          />
        ))}
      </div>

      <p className="farkle-status" role="status" aria-live="polite">{status}</p>

      {!game.over && (
        <div className="farkle-turn">
          <p className="farkle-turn-score">
            This turn: <strong>{points(game.turnScore)}</strong>
            {preview !== null && <span className="farkle-preview"> + {points(preview)}</span>}
          </p>
          <p className="farkle-prompt">{prompt}</p>
        </div>
      )}

      {myTurn && (
        <div className="farkle-actions">
          {!game.rolled ? (
            <button type="button" className="farkle-button is-main" disabled={busy} onClick={() => onAct({ type: 'roll' })}>
              Roll {game.held.filter((held) => !held).length} dice
            </button>
          ) : (
            <>
              <button
                type="button"
                className="farkle-button"
                disabled={busy || preview === null}
                onClick={() => onAct({ type: 'roll', keep: picked })}
              >
                Keep and roll {nextRoll}
              </button>
              <button
                type="button"
                className="farkle-button is-main"
                disabled={busy || preview === null}
                onClick={() => onAct({ type: 'bank', keep: picked })}
              >
                Bank {preview === null ? '' : points(game.turnScore + preview)}
              </button>
            </>
          )}
        </div>
      )}

      {!playing && !game.over && <p className="farkle-watching">You're watching. You'll be dealt in next game.</p>}

      {game.over && (
        <div className="farkle-actions">
          <button type="button" className="farkle-button is-main" disabled={busy || !canPlayAgain} onClick={onPlayAgain}>
            Play again
          </button>
          {!canPlayAgain && <p className="farkle-watching">Needs at least two players at the table.</p>}
        </div>
      )}

      <details className="farkle-help">
        <summary>How scoring works</summary>
        <ul>
          <li>Each 1 is 100, each 5 is 50</li>
          <li>Three of a kind is the number times 100, and three 1s are 1,000</li>
          <li>Four, five, or six of a kind are 1,000, 2,000, or 3,000</li>
          <li>A straight 1 to 6, or three pairs, is 1,500. Two sets of three is 2,500</li>
          <li>After each roll, keep at least one scoring die. A roll with nothing to keep is a farkle, and you lose that turn's points</li>
          <li>Score with all six dice and you get to roll all six again</li>
        </ul>
      </details>
    </div>
  )
}
