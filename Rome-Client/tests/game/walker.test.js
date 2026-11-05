import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createKeyStack, directionForKey } from '../../src/game/keys.js'
import { generateTown, isWalkable } from '../../src/game/map.js'
import { findRoute } from '../../src/game/route.js'
import { WALK_TILES_PER_SECOND, createWalker, routeStart, stepWalker, walkerPosition } from '../../src/game/walker.js'

const map = generateTown()
const TICK = 1000 / 60

function run(walker, held, milliseconds, tick = TICK) {
  for (let elapsed = 0; elapsed < milliseconds; elapsed += tick) stepWalker(walker, map, held, tick)
}

test('holding a key walks at the expected speed', () => {
  const walker = createWalker(45, 34, 'up')
  run(walker, 'up', 1000)
  const position = walkerPosition(walker)
  const travelled = 34 - position.y
  assert.ok(Math.abs(travelled - WALK_TILES_PER_SECOND) < 0.2, `travelled ${travelled} tiles in a second`)
})

test('speed is the same at 60Hz and 144Hz', () => {
  const slow = createWalker(45, 34, 'up')
  const fast = createWalker(45, 34, 'up')
  run(slow, 'up', 1000, 1000 / 60)
  run(fast, 'up', 1000, 1000 / 144)
  assert.ok(Math.abs(walkerPosition(slow).y - walkerPosition(fast).y) < 0.15)
})

test('a new direction turns and starts walking on the same tick', () => {
  const walker = createWalker(45, 30, 'up')
  stepWalker(walker, map, 'left', TICK)
  assert.equal(walker.facing, 'left')
  assert.equal(walker.moving, true)
  assert.equal(walker.toX, 44)
})

test('a new diagonal turns and starts walking on the same tick', () => {
  const walker = createWalker(45, 30, 'down')
  stepWalker(walker, map, 'up-left', TICK)
  assert.equal(walker.facing, 'left')
  assert.equal(walker.moving, true)
})

test('tapping the direction already faced steps straight away', () => {
  const walker = createWalker(45, 30, 'up')
  run(walker, 'up', TICK)
  assert.equal(walker.moving, true)
})

test('changing direction while walking has no pause', () => {
  const walker = createWalker(45, 30, 'up')
  run(walker, 'up', 210)
  assert.equal(walker.moving, true)
  const startX = walker.x
  for (let tick = 0; tick < 15; tick += 1) {
    stepWalker(walker, map, 'left', TICK)
    assert.equal(walker.moving, true)
  }
  assert.equal(walker.facing, 'left')
  assert.ok(walker.toX < startX)
})

test('walking into something solid only turns the walker', () => {
  const well = { x: 44, y: 17 }
  assert.ok(!isWalkable(map, well.x + 1, well.y))
  const walker = createWalker(well.x, well.y, 'up')
  run(walker, 'right', 1000)
  assert.equal(walker.facing, 'right')
  assert.equal(walker.x, well.x)
  assert.equal(walker.moving, false)
})

test('a long hold in every direction never ends on a blocked tile', () => {
  for (const direction of ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right']) {
    const walker = createWalker(map.spawn.x, map.spawn.y, 'up')
    run(walker, direction, 30000)
    assert.ok(isWalkable(map, walker.x, walker.y), `${direction} ended on a blocked tile`)
  }
})

test('a big frame gap cannot carry the walker through a wall', () => {
  const walker = createWalker(map.spawn.x, map.spawn.y, 'down')
  stepWalker(walker, map, 'down', 60000)
  assert.ok(isWalkable(map, walker.x, walker.y))
  assert.ok(walker.y < map.gate.y)
})

test('a walker follows a route to its end', () => {
  const walker = createWalker(map.spawn.x, map.spawn.y, 'up')
  const target = { x: 60, y: 17 }
  walker.route = findRoute(map, routeStart(walker), target)
  run(walker, null, 20000)
  assert.equal(walker.x, target.x)
  assert.equal(walker.y, target.y)
  assert.equal(walker.moving, false)
  assert.equal(walker.route.length, 0)
})

test('pressing a key cancels a route', () => {
  const walker = createWalker(45, 33, 'up')
  walker.route = findRoute(map, routeStart(walker), { x: 45, y: 26 })
  run(walker, null, 500)
  run(walker, 'down', TICK)
  assert.equal(walker.route.length, 0)
})

test('a route replaced mid-step begins from the tile being walked to', () => {
  const walker = createWalker(45, 33, 'up')
  run(walker, 'up', 50)
  assert.equal(walker.moving, true)
  assert.deepEqual(routeStart(walker), { x: 45, y: 32 })
  walker.route = findRoute(map, routeStart(walker), { x: 46, y: 32 })
  run(walker, null, 1000)
  assert.equal(walker.x, 46)
  assert.equal(walker.y, 32)
})

test('the newest of two opposite keys wins, and releasing it falls back to the older one', () => {
  const keys = createKeyStack()
  keys.press('ArrowUp')
  assert.equal(keys.current(), 'up')
  keys.press('ArrowDown')
  assert.equal(keys.current(), 'down')
  keys.press('ArrowUp')
  assert.equal(keys.current(), 'down', 'a repeat press changes nothing')
  keys.release('ArrowDown')
  assert.equal(keys.current(), 'up')
  keys.clear()
  assert.equal(keys.current(), null)
})

test('a key pressed and released between frames still counts once', () => {
  const keys = createKeyStack()
  keys.press('ArrowLeft')
  keys.release('ArrowLeft')
  assert.equal(keys.current(), 'left')
  keys.used()
  assert.equal(keys.current(), null)
})

test('a tap walks exactly one tile', () => {
  const keys = createKeyStack()
  const walker = createWalker(45, 30, 'up')
  keys.press('ArrowLeft')
  keys.release('ArrowLeft')
  stepWalker(walker, map, keys.current(), TICK)
  keys.used()
  for (let tick = 0; tick < 60; tick += 1) {
    stepWalker(walker, map, keys.current(), TICK)
    keys.used()
  }
  assert.equal(walker.x, 44)
  assert.equal(walker.facing, 'left')
})

test('only movement keys count as directions', () => {
  assert.equal(directionForKey('KeyW'), 'up')
  assert.equal(directionForKey('ArrowRight'), 'right')
  assert.equal(directionForKey('KeyE'), null)
})

test('an up or down key plus a left or right key makes a diagonal', () => {
  const keys = createKeyStack()
  keys.press('ArrowUp')
  keys.press('KeyA')
  assert.equal(keys.current(), 'up-left')
  keys.press('ArrowRight')
  assert.equal(keys.current(), 'up-right')
  keys.release('ArrowUp')
  assert.equal(keys.current(), 'right')
})

test('holding a diagonal moves on both axes', () => {
  const walker = createWalker(40, 17, 'up')
  run(walker, 'up-left', 1000)
  const position = walkerPosition(walker)
  assert.ok(position.x < 40 && position.y < 17)
  assert.ok(Math.abs((40 - position.x) - (17 - position.y)) <= 1.01)
})

test('diagonal walking covers ground at the same speed as straight walking', () => {
  const walker = createWalker(36, 20, 'right')
  run(walker, 'up-right', 700)
  const position = walkerPosition(walker)
  const travelled = Math.hypot(position.x - 36, position.y - 20)
  assert.ok(Math.abs(travelled - WALK_TILES_PER_SECOND * 0.7) < 0.35, `travelled ${travelled} tiles`)
})

test('a diagonal never cuts through a corner', () => {
  const walker = createWalker(44, 20, 'up')
  // The well occupies 45 to 47 across and 16 to 18 down, directly ahead on the right.
  run(walker, 'up-right', 2000)
  assert.ok(isWalkable(map, walker.x, walker.y))
  for (let elapsed = 0; elapsed < 4000; elapsed += TICK) {
    stepWalker(walker, map, 'up-right', TICK)
    assert.ok(isWalkable(map, walker.toX, walker.toY))
  }
})

test('walking at a wall on a diagonal slides along it', () => {
  // The city wall is directly below the bottom row of the road.
  const walker = createWalker(45, 35, 'down')
  run(walker, 'down-right', 400)
  assert.equal(walker.y, 35, 'the wall stops downward movement')
  assert.ok(walker.x > 45 || walker.toX > 45, 'the walker keeps sliding sideways')
})

test('a corner with nowhere to go only turns the walker', () => {
  const corner = { x: 44, y: 18 }
  const walker = createWalker(corner.x, corner.y, 'left')
  run(walker, 'right', 500)
  assert.equal(walker.x, corner.x)
  assert.equal(walker.facing, 'right')
})
