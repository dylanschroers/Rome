import assert from 'node:assert/strict'
import { test } from 'node:test'
import { atTheBar, findSeat, initials, refusalText, seatsTaken } from '../../src/tavern/room.js'

const ann = { id: 'p1', name: 'Ann' }
const bo = { id: 'p2', name: 'Bo' }
const cy = { id: 'p3', name: 'Cy Long Name' }
const tables = [
  { id: 'hearth', name: 'By the hearth', seats: [null, ann, null, null] },
  { id: 'window', name: 'Window seat', seats: [bo, null, null, null] },
]

test('your seat is found by your presence id', () => {
  assert.deepEqual(findSeat(tables, 'p1'), { table: tables[0], seat: 1 })
  assert.equal(findSeat(tables, 'p3'), null)
  assert.equal(findSeat(tables, null), null)
})

test('anyone not sitting is at the bar', () => {
  assert.deepEqual(atTheBar([ann, bo, cy], tables), [cy])
  assert.deepEqual(atTheBar([], tables), [])
})

test('seats taken are counted', () => {
  assert.equal(seatsTaken(tables[0]), 1)
  assert.equal(seatsTaken({ seats: [null, null] }), 0)
})

test('initials use the first and last word', () => {
  assert.equal(initials('Weary Traveler'), 'WT')
  assert.equal(initials('Cy Long Name'), 'CN')
  assert.equal(initials('bo'), 'BO')
  assert.equal(initials('  '), '?')
  assert.equal(initials(undefined), '?')
})

test('refusals read plainly, with a fallback', () => {
  assert.equal(refusalText('full'), 'That table is full.')
  assert.equal(refusalText('mystery'), "That didn't work. Try again.")
})
