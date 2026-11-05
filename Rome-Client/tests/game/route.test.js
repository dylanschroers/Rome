import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canStep, generateTown, isWalkable } from '../../src/game/map.js'
import { findRoute } from '../../src/game/route.js'

const map = generateTown()

function assertValidRoute(from, route) {
  let at = from
  for (const tile of route) {
    assert.equal(Math.max(Math.abs(tile.x - at.x), Math.abs(tile.y - at.y)), 1, 'steps must be one tile apart')
    assert.ok(canStep(map, at.x, at.y, tile.x - at.x, tile.y - at.y), `route cuts a corner at ${tile.x},${tile.y}`)
    assert.ok(isWalkable(map, tile.x, tile.y), `route crosses a blocked tile at ${tile.x},${tile.y}`)
    at = tile
  }
}

test('a route is a chain of walkable neighboring tiles', () => {
  const from = map.spawn
  const route = findRoute(map, from, { x: 74, y: 22 })
  assert.ok(route.length > 0)
  assertValidRoute(from, route)
  assert.deepEqual(route[route.length - 1], { x: 74, y: 22 })
})

test('a route in open ground takes the shortest number of steps', () => {
  const route = findRoute(map, { x: 45, y: 34 }, { x: 45, y: 26 })
  assert.equal(route.length, 8)
})

test('a route to the current tile is empty', () => {
  assert.deepEqual(findRoute(map, { x: 45, y: 30 }, { x: 45, y: 30 }), [])
})

test('tapping a blocked tile walks to the closest reachable tile', () => {
  const building = map.buildings.find((item) => item.name === 'School')
  const target = { x: building.x + 2, y: building.y + 1 }
  assert.ok(!isWalkable(map, target.x, target.y))

  const route = findRoute(map, map.spawn, target)
  assertValidRoute(map.spawn, route)
  const end = route[route.length - 1]
  assert.ok(isWalkable(map, end.x, end.y))
  assert.ok(Math.hypot(end.x - target.x, end.y - target.y) <= 4, 'route should end near the target')
})

test('tapping off the map still gives a valid route', () => {
  const route = findRoute(map, map.spawn, { x: -20, y: 500 })
  assertValidRoute(map.spawn, route)
})

test('routes around the well go past it, not through it', () => {
  const from = { x: 42, y: 17 }
  const route = findRoute(map, from, { x: 50, y: 17 })
  assertValidRoute(from, route)
  assert.ok(route.some((tile) => tile.y !== 17), 'the straight line is blocked by the well')
})

test('routes use diagonals when they are shorter', () => {
  const from = { x: 42, y: 20 }
  const route = findRoute(map, from, { x: 45, y: 23 })
  assert.equal(route.length, 3)
  assertValidRoute(from, route)
})

test('routes do not squeeze diagonally past a building corner', () => {
  for (const building of map.buildings) {
    const route = findRoute(map, map.spawn, building.door)
    assertValidRoute(map.spawn, route)
  }
})
