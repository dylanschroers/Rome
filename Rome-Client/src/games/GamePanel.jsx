import { useEffect, useState } from 'react'
import { GAMES } from '@shared/games/index.js'
import ChessBoard from './chess/ChessBoard'
import FarkleBoard from './farkle/FarkleBoard'
import PokerTable from './poker/PokerTable'

const BOARDS = { farkle: FarkleBoard, chess: ChessBoard, poker: PokerTable }
const BLURBS = {
  farkle: 'Push-your-luck dice. Roll six, keep what scores, and bank before you bust.',
  chess: 'The classic. Two players, no luck.',
  poker: "Texas Hold'em for play chips. Last one with chips wins.",
}

const needs = (rules) => (rules.minPlayers === rules.maxPlayers ? `exactly ${rules.minPlayers}` : `${rules.minPlayers} to ${rules.maxPlayers}`)

export default function GamePanel({ table, game, me, busy, onStart, onAct }) {
  const seated = table.seats.filter(Boolean).length
  const names = new Map(table.seats.filter(Boolean).map((occupant) => [occupant.id, occupant.name]))
  const nameOf = (id) => names.get(id) ?? game?.players.find((player) => player.id === id)?.name ?? 'Someone'
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    if (!game?.over) setChoosing(false)
  }, [game?.over])

  if (game && BOARDS[game.game] && !choosing) {
    const Board = BOARDS[game.game]
    const rules = GAMES[game.game]
    return (
      <section className="tavern-game" aria-label={`${rules.name} at ${table.name}`}>
        <Board
          game={game}
          me={me}
          nameOf={nameOf}
          busy={busy}
          canPlayAgain={seated >= rules.minPlayers && seated <= rules.maxPlayers}
          onAct={onAct}
          onPlayAgain={() => onStart(game.game)}
        />
        {game.over && (
          <button type="button" className="tavern-game-switch" onClick={() => setChoosing(true)}>
            Play something else
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="tavern-game is-idle" aria-label={`Games at ${table.name}`}>
      <p className="tavern-game-heading">Play a game</p>
      {Object.values(GAMES).map((rules) => {
        const ready = seated >= rules.minPlayers && seated <= rules.maxPlayers
        return (
          <div key={rules.id} className="tavern-game-offer">
            <div>
              <p className="tavern-game-name">{rules.name}</p>
              <p className="tavern-game-blurb">{BLURBS[rules.id]}</p>
              <p className="tavern-game-need">
                {ready ? `${seated} at the table, ready to play` : `Needs ${needs(rules)} players. ${seated} seated.`}
              </p>
            </div>
            <button type="button" className="farkle-button is-main" disabled={busy || !ready} onClick={() => onStart(rules.id)}>
              Start {rules.name}
            </button>
          </div>
        )
      })}
    </section>
  )
}
