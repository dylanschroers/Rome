import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authorName, groupMessages } from '../../src/tavern/messages.js'

const at = (minutes) => new Date(Date.UTC(2026, 10, 6, 20, minutes)).toISOString()

test('back-to-back messages from one person group together', () => {
  const groups = groupMessages([
    { id: 1, userId: 'a', name: 'Tom', content: 'hi', timestamp: at(0) },
    { id: 2, userId: 'a', name: 'Tom', content: 'anyone?', timestamp: at(2) },
    { id: 3, userId: 'b', name: 'Ann', content: 'hello', timestamp: at(3) },
    { id: 4, userId: 'a', name: 'Tom', content: 'hey Ann', timestamp: at(4) },
  ])
  assert.deepEqual(groups.map((group) => [group.name, group.messages.length]), [['Tom', 2], ['Ann', 1], ['Tom', 1]])
})

test('a long pause or a new name starts a new group', () => {
  const groups = groupMessages([
    { id: 1, userId: 'a', name: 'Tom', content: 'hi', timestamp: at(0) },
    { id: 2, userId: 'a', name: 'Tom', content: 'back', timestamp: at(10) },
    { id: 3, userId: 'a', name: 'Old Tom', content: 'renamed', timestamp: at(11) },
  ])
  assert.equal(groups.length, 3)
})

test('older messages without a name fall back to the id', () => {
  assert.equal(authorName({ userId: 'user_abc' }), 'user_abc')
  assert.equal(authorName({}), 'Someone')
  assert.equal(groupMessages([]).length, 0)
})
