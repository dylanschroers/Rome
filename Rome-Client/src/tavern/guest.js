export const MAX_NAME = 24
const STORAGE_KEY = 'rome-guest'
const ADJECTIVES = ['Weary', 'Merry', 'Quiet', 'Wandering', 'Bold', 'Lucky', 'Sly', 'Humble', 'Jolly', 'Restless']
const NOUNS = ['Traveler', 'Bard', 'Smith', 'Pilgrim', 'Merchant', 'Scribe', 'Fox', 'Raven', 'Sailor', 'Mason']

const pick = (list, random) => list[Math.floor(random() * list.length) % list.length]

export function makeGuestName(random = Math.random) {
  return `${pick(ADJECTIVES, random)} ${pick(NOUNS, random)}`
}

export function cleanName(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_NAME).trim()
}

function makeId(random) {
  return `guest_${Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0')}`
}

export function readGuest(storage = globalThis.localStorage, random = Math.random) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null')
    const name = cleanName(saved?.name)
    if (typeof saved?.id === 'string' && saved.id.startsWith('guest_') && name) return { id: saved.id, name }
  } catch {
    // Unreadable or blocked storage gets a fresh guest below.
  }
  const guest = { id: makeId(random), name: makeGuestName(random) }
  saveGuest(guest, storage)
  return guest
}

export function saveGuest(guest, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(guest))
    return true
  } catch {
    return false
  }
}
