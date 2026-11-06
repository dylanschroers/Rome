export const MODE_IDS = ['topdown']
export const DEFAULT_MODE = 'topdown'
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
