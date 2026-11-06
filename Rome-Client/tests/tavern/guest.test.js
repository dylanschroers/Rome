import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_NAME, cleanName, makeGuestName, readGuest, saveGuest } from '../../src/tavern/guest.js'

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

const blocked = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
}

test('guest names are two words', () => {
  assert.equal(makeGuestName(() => 0), 'Weary Traveler')
  assert.equal(makeGuestName(() => 0.999), 'Restless Mason')
  assert.match(makeGuestName(), /^\w+ \w+$/)
})

test('names are trimmed, squeezed, and kept short', () => {
  assert.equal(cleanName('  Old   Tom  '), 'Old Tom')
  assert.equal(cleanName('a\u0000b\nc'), 'ab c')
  assert.equal(cleanName('x'.repeat(40)).length, MAX_NAME)
  assert.equal(cleanName('   '), '')
  assert.equal(cleanName(null), '')
  assert.equal(cleanName(42), '')
})

test('a guest is made once and then remembered', () => {
  const storage = memoryStorage()
  const first = readGuest(storage)
  assert.match(first.id, /^guest_[0-9a-z]{8}$/)
  assert.deepEqual(readGuest(storage), first)
  saveGuest({ ...first, name: 'Old Tom' }, storage)
  assert.equal(readGuest(storage).name, 'Old Tom')
})

test('broken or blocked storage still gives a usable guest', () => {
  for (const value of ['not json', '{"id":5,"name":"x"}', '{"id":"guest_1","name":"   "}', '{"id":"admin","name":"Tom"}']) {
    const guest = readGuest(memoryStorage({ 'rome-guest': value }))
    assert.match(guest.id, /^guest_/)
    assert.ok(guest.name.length > 0)
  }
  const guest = readGuest(blocked)
  assert.match(guest.id, /^guest_/)
  assert.equal(saveGuest(guest, blocked), false)
})
