export function findSeat(tables, presenceId) {
  if (!presenceId) return null
  for (const table of tables) {
    const seat = table.seats.findIndex((occupant) => occupant?.id === presenceId)
    if (seat !== -1) return { table, seat }
  }
  return null
}

export function atTheBar(here, tables) {
  const seated = new Set(tables.flatMap((table) => table.seats.filter(Boolean).map((occupant) => occupant.id)))
  return here.filter((guest) => !seated.has(guest.id))
}

export const seatsTaken = (table) => table.seats.filter(Boolean).length

export function initials(name) {
  const words = String(name || '?').trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] || '?').slice(0, 2)
  return letters.toUpperCase()
}

const REFUSALS = {
  taken: 'Someone just took that seat.',
  full: 'That table is full.',
  'seated-elsewhere': "You're already sitting down in another tab.",
  'too-fast': 'Slow down a little, then try again.',
  'not-seated': "You're not at a table anymore.",
  offline: "Can't reach the tavern right now.",
}

export const refusalText = (reason) => REFUSALS[reason] || "That didn't work. Try again."
