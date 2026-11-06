import { GAMES } from '@shared/games/index.js'
import FarkleBoard from './farkle/FarkleBoard'

const BOARDS = { farkle: FarkleBoard }
const BLURBS = { farkle: 'Push-your-luck dice. Roll six, keep what scores, and bank before you bust.' }

export default function GamePanel({ table, game, me, busy, onStart, onAct }) {
  const seated = table.seats.filter(Boolean).length
  const names = new Map(table.seats.filter(Boolean).map((occupant) => [occupant.id, occupant.name]))
  const nameOf = (id) => names.get(id) ?? game?.players.find((player) => player.id === id)?.name ?? 'Someone'

  if (game && BOARDS[game.game]) {
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
      </section>
    )
  }

  return (
    <section className="tavern-game is-idle" aria-label={`Games at ${table.name}`}>
      {Object.values(GAMES).map((rules) => {
        const ready = seated >= rules.minPlayers && seated <= rules.maxPlayers
        return (
          <div key={rules.id} className="tavern-game-offer">
            <div>
              <p className="tavern-game-name">{rules.name}</p>
              <p className="tavern-game-blurb">{BLURBS[rules.id]}</p>
              <p className="tavern-game-need">
                {ready ? `${seated} at the table, ready to play` : `Needs ${rules.minPlayers} to ${rules.maxPlayers} players. ${seated} seated.`}
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
