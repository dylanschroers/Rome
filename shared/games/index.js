import { FARKLE } from './farkle.js'

export const GAMES = { farkle: FARKLE }

export const findGame = (id) => (Object.hasOwn(GAMES, id) ? GAMES[id] : null)
