export const MODE_IDS = ['map', 'topdown']
export const DEFAULT_MODE = 'map'
const STORAGE_KEY = 'rome-mode'

export const pickMode = (value) => (MODE_IDS.includes(value) ? value : DEFAULT_MODE)

export function readSavedMode(storage = globalThis.localStorage) {
  try {
    return pickMode(storage?.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_MODE
  }
}

export function saveMode(id, storage = globalThis.localStorage) {
  if (!MODE_IDS.includes(id)) return false
  try {
    storage.setItem(STORAGE_KEY, id)
    return true
  } catch {
    return false
  }
}

// Until there's a button for it, ?mode=topdown in the address switches modes and is remembered.
export function chooseMode(search = '', storage = globalThis.localStorage) {
  const asked = new URLSearchParams(search).get('mode')
  if (MODE_IDS.includes(asked)) {
    saveMode(asked, storage)
    return asked
  }
  return readSavedMode(storage)
}
