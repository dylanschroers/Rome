import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_MODE, MODE_IDS, pickMode, readSavedMode, saveMode } from '../../src/modes/modeChoice.js'

function memoryStorage(initial = {}) {
  const items = { ...initial }
  return {
    items,
    getItem: (key) => (key in items ? items[key] : null),
    setItem: (key, value) => {
      items[key] = String(value)
    },
  }
}

const brokenStorage = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
}

test('the top-down mode is the default and the only mode so far', () => {
  assert.equal(DEFAULT_MODE, 'topdown')
  assert.deepEqual(MODE_IDS, ['topdown'])
})

test('an unknown or missing saved mode falls back to the default', () => {
  for (const value of [null, undefined, '', 'firstperson', '__proto__', 'TOPDOWN']) {
    assert.equal(pickMode(value), DEFAULT_MODE)
  }
  assert.equal(readSavedMode(memoryStorage({ 'rome-mode': 'map3d' })), DEFAULT_MODE)
  assert.equal(readSavedMode(memoryStorage()), DEFAULT_MODE)
  assert.equal(readSavedMode(undefined), DEFAULT_MODE)
})

test('a saved mode is read back, and blocked storage never throws', () => {
  const storage = memoryStorage()
  assert.ok(saveMode('topdown', storage))
  assert.equal(storage.items['rome-mode'], 'topdown')
  assert.equal(readSavedMode(storage), 'topdown')
  assert.equal(saveMode('nonsense', storage), false)
  assert.equal(readSavedMode(brokenStorage), DEFAULT_MODE)
  assert.equal(saveMode('topdown', brokenStorage), false)
})
