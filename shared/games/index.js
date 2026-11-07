import { CHESS } from './chess.js'
import { FARKLE } from './farkle.js'
import { POKER } from './poker.js'

export const GAMES = { farkle: FARKLE, chess: CHESS, poker: POKER }

export const findGame = (id) => (Object.hasOwn(GAMES, id) ? GAMES[id] : null)

// Games with hidden information say what each person may see. The rest show everything.
export function viewFor(state, viewerId) {
  if (!state) return null
  const game = findGame(state.game)
  return game?.view ? game.view(state, viewerId) : state
}
