import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateTown, isWalkable } from '../../src/game/map.js'
import { doorStart, findPlace, listPlaces, placeNear, placeUnderTile, townAddress } from '../../src/game/places.js'
import { findRoute } from '../../src/game/route.js'
import { WALK_TILES_PER_SECOND, createWalker, placeWalker, stepWalker } from '../../src/game/walker.js'

const map = generateTown()
const TICK = 1000 / 60

test('every named place has a unique id, and empty plots have none', () => {
  const places = listPlaces(map)
  assert.equal(places.length, 10)
  assert.equal(new Set(places.map((place) => place.id)).size, places.length)
  assert.ok(map.buildings.filter((item) => item.name === 'Empty plot').every((item) => item.id === null))
  assert.equal(map.buildings.length, 17)
})

test('only the three working places have somewhere to go', () => {
  const open = listPlaces(map).filter((place) => place.open)
  assert.deepEqual(open.map((place) => [place.id, place.path]), [
    ['school', '/school'],
    ['message-board', '/messages'],
    ['language-stall', '/school/languages'],
  ])
  assert.ok(listPlaces(map).filter((place) => !place.open).every((place) => place.path === null))
})

test('every door start is walkable and reachable from the gate', () => {
  for (const place of listPlaces(map)) {
    const start = doorStart(place)
    assert.ok(isWalkable(map, start.x, start.y), `${place.id} door is blocked`)
    const route = findRoute(map, map.spawn, start)
    assert.deepEqual(route[route.length - 1], { x: start.x, y: start.y })
  }
})

test('stepping out of a door faces away from the building', () => {
  for (const place of listPlaces(map)) {
    const start = doorStart(place)
    const ahead = {
      up: [start.x, start.y - 1],
      down: [start.x, start.y + 1],
      left: [start.x - 1, start.y],
      right: [start.x + 1, start.y],
    }[start.facing]
    const insideBuilding = ahead[0] >= place.x && ahead[0] < place.x + place.width
      && ahead[1] >= place.y && ahead[1] < place.y + place.height
    assert.ok(!insideBuilding, `${place.id} faces into its own building`)
  }
})

test('standing at or next to a door finds that place', () => {
  const school = findPlace(map, 'school')
  assert.equal(placeNear(map, school.door.x, school.door.y), school)
  assert.equal(placeNear(map, school.door.x + 1, school.door.y + 1), school)
  assert.equal(placeNear(map, school.door.x + 2, school.door.y), null)
})

test('being near an empty plot or out on the road finds nothing', () => {
  const plot = map.buildings.find((item) => item.name === 'Empty plot')
  assert.equal(placeNear(map, plot.door.x, plot.door.y), null)
  assert.equal(placeNear(map, map.spawn.x, map.spawn.y), null)
})

test('a tile on a building or its roof finds that place', () => {
  const stall = findPlace(map, 'language-stall')
  assert.equal(placeUnderTile(map, stall.x + 1, stall.y + 1), stall)
  assert.equal(placeUnderTile(map, stall.x + 1, stall.y - 2), stall)
  assert.equal(placeUnderTile(map, stall.x + 1, stall.y - 3), null)
  const plot = map.buildings.find((item) => item.name === 'Empty plot')
  assert.equal(placeUnderTile(map, plot.x + 1, plot.y + 1), null)
})

test('unknown place ids find nothing', () => {
  assert.equal(findPlace(map, 'nowhere'), null)
  assert.equal(findPlace(map, ''), null)
  assert.equal(findPlace(map, null), null)
})

test('a place address links back to its door', () => {
  assert.equal(townAddress('school'), '/town-test?at=school')
})

test('running covers twice the ground of walking', () => {
  const walker = createWalker(45, 34, 'up')
  const runner = createWalker(45, 34, 'up')
  for (let tick = 0; tick < 30; tick += 1) {
    stepWalker(walker, map, 'up', TICK)
    stepWalker(runner, map, 'up', TICK, true)
  }
  assert.ok(Math.abs((34 - walker.y) - WALK_TILES_PER_SECOND / 2) <= 1)
  assert.ok(Math.abs((34 - runner.y) - WALK_TILES_PER_SECOND) <= 1)
})

test('running never carries the walker through a wall', () => {
  for (const direction of ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right']) {
    const runner = createWalker(map.spawn.x, map.spawn.y, 'up')
    for (let tick = 0; tick < 1200; tick += 1) {
      stepWalker(runner, map, direction, TICK, true)
      assert.ok(isWalkable(map, runner.toX, runner.toY), `${direction} reached a blocked tile`)
    }
  }
})

test('a long route can run itself, and stops running when it ends', () => {
  const walker = createWalker(map.spawn.x, map.spawn.y, 'up')
  const school = findPlace(map, 'school')
  walker.route = findRoute(map, map.spawn, school.door)
  walker.autoRun = true
  for (let tick = 0; tick < 600; tick += 1) stepWalker(walker, map, null, TICK)
  assert.equal(walker.x, school.door.x)
  assert.equal(walker.y, school.door.y)
  assert.equal(walker.autoRun, false)
})

test('a held key stops a route from running itself', () => {
  const walker = createWalker(45, 34, 'up')
  walker.route = findRoute(map, { x: 45, y: 34 }, { x: 45, y: 26 })
  walker.autoRun = true
  stepWalker(walker, map, 'up', TICK)
  assert.equal(walker.autoRun, false)
  assert.equal(walker.route.length, 0)
})

test('placing a walker clears anything it was doing', () => {
  const walker = createWalker(45, 34, 'up')
  walker.route = findRoute(map, { x: 45, y: 34 }, { x: 45, y: 26 })
  walker.autoRun = true
  stepWalker(walker, map, null, TICK)
  placeWalker(walker, 18, 17, 'down')
  assert.deepEqual([walker.x, walker.y, walker.toX, walker.toY], [18, 17, 18, 17])
  assert.equal(walker.facing, 'down')
  assert.equal(walker.moving, false)
  assert.equal(walker.route.length, 0)
  assert.equal(walker.autoRun, false)
})
