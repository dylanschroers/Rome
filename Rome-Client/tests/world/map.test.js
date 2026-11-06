import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAP_HEIGHT, MAP_WIDTH, TILE, districtNameAt, gateExitRow, generateTown, isAtGateExit, isGateTile, isLeavingByGate, isWalkable,
} from '../../src/world/map.js'
import { findRoute } from '../../src/world/route.js'
import { routeSeconds } from '../../src/modes/topdown/walker.js'

const map = generateTown()
const spawn = map.spawn
const tileAt = (x, y) => map.tiles[y * map.width + x]

function reachable(from, x, y) {
  if (x === from.x && y === from.y) return true
  const route = findRoute(map, from, { x, y })
  const last = route[route.length - 1]
  return Boolean(last) && last.x === x && last.y === y
}

const named = (name) => map.buildings.find((item) => item.name === name)

test('the map has the planned size and two plazas', () => {
  assert.equal(map.width, 104)
  assert.equal(map.height, 94)
  assert.equal(map.tiles.length, MAP_WIDTH * MAP_HEIGHT)
  assert.deepEqual(map.districts.map((item) => item.name), ['Market', 'Residential'])
})

test('the Market sits just inside the gate, with Residential north of it', () => {
  const market = map.districts.find((item) => item.id === 'market')
  const residential = map.districts.find((item) => item.id === 'residential')
  assert.ok(market.y > residential.y)
  assert.ok(spawn.y > market.y)
  assert.equal(districtNameAt(map, market.x, market.y), 'Market')
  assert.equal(districtNameAt(map, residential.x + 3, residential.y), 'Residential')
})

test('the visitor starts on a walkable tile just inside the gate', () => {
  assert.ok(isWalkable(map, spawn.x, spawn.y))
  assert.ok(spawn.y < map.gate.y)
  assert.ok(spawn.x >= map.gate.x && spawn.x < map.gate.x + map.gate.width)
})

test('the Market has its six buildings, and Residential has eight empty plots', () => {
  const market = map.buildings.filter((item) => item.district === 'market').map((item) => item.name).sort()
  assert.deepEqual(market, ['Garage', 'Library', 'News', 'School', 'Tavern', 'Theater'])
  const residential = map.buildings.filter((item) => item.district === 'residential')
  assert.equal(residential.length, 8)
  assert.ok(residential.every((item) => item.name === 'Empty plot' && item.id === null))
})

test('the Castle, Garden, and Colosseum sit north, west, and east of Residential', () => {
  const residential = map.districts.find((item) => item.id === 'residential')
  const castle = named('Castle')
  const garden = named('Garden')
  const colosseum = named('Colosseum')
  assert.ok(castle.y + castle.height < residential.y)
  assert.ok(garden.x + garden.width < residential.x)
  assert.ok(colosseum.x > residential.x)
})

test('stairs climb from the Market to Residential, and on to the Castle', () => {
  const route = findRoute(map, spawn, named('Castle').door)
  const stairsSteps = route.filter((tile) => tileAt(tile.x, tile.y) === TILE.STAIRS).length
  assert.ok(stairsSteps >= 12, `only ${stairsSteps} stair tiles on the way to the Castle`)
  const castleStairs = route.filter((tile) => tile.y < 36 && tileAt(tile.x, tile.y) === TILE.STAIRS)
  assert.ok(castleStairs.length > 0)
})

test('the Colosseum can be reached by stairs from the Market and by path from Residential', () => {
  const colosseumDoor = named('Colosseum').door
  const market = map.districts.find((item) => item.id === 'market')
  const residential = map.districts.find((item) => item.id === 'residential')

  const fromMarket = findRoute(map, { x: market.x + 4, y: market.y - 5 }, colosseumDoor)
  assert.ok(fromMarket.some((tile) => tileAt(tile.x, tile.y) === TILE.STAIRS && tile.x > 70))

  const fromResidential = findRoute(map, { x: residential.x + 8, y: residential.y + 1 }, colosseumDoor)
  assert.ok(fromResidential.length > 0)
  assert.ok(fromResidential.every((tile) => tileAt(tile.x, tile.y) !== TILE.STAIRS))
})

test('the Garden opens straight off Residential, without stairs', () => {
  const residential = map.districts.find((item) => item.id === 'residential')
  const route = findRoute(map, { x: residential.x - 8, y: residential.y + 1 }, named('Garden').door)
  assert.ok(route.length > 0)
  assert.ok(route.every((tile) => tileAt(tile.x, tile.y) !== TILE.STAIRS))
})

test('stairs are the only way between levels', () => {
  const blocked = new Uint8Array(map.solid)
  map.tiles.forEach((tile, index) => {
    if (tile === TILE.STAIRS) blocked[index] = 1
  })
  const walledOff = { ...map, solid: blocked }
  const residential = map.districts.find((item) => item.id === 'residential')
  const route = findRoute(walledOff, spawn, { x: residential.x + 3, y: residential.y })
  const end = route[route.length - 1]
  assert.ok(Math.hypot(end.x - residential.x, end.y - residential.y) > 12, 'Residential is reachable without stairs')
})

test('every building door can be reached from the gate', () => {
  assert.equal(map.buildings.length, 17)
  for (const building of map.buildings) {
    const { door } = building
    assert.ok(isWalkable(map, door.x, door.y), `${building.name} door is blocked`)
    assert.ok(reachable(spawn, door.x, door.y), `${building.name} door is unreachable`)
  }
})

test('buildings do not overlap, and all sit inside the map', () => {
  const taken = new Set()
  for (const building of map.buildings) {
    assert.ok(building.x >= 0 && building.y >= 0)
    assert.ok(building.x + building.width <= map.width && building.y + building.height <= map.height)
    for (let y = building.y; y < building.y + building.height; y += 1) {
      for (let x = building.x; x < building.x + building.width; x += 1) {
        const key = `${x},${y}`
        assert.ok(!taken.has(key), `${building.name} overlaps another building at ${key}`)
        taken.add(key)
        assert.ok(!isWalkable(map, x, y), `${building.name} can be walked through at ${key}`)
      }
    }
  }
})

test('working places are a short walk away, and landmarks are not far', () => {
  for (const name of ['School', 'Tavern']) {
    assert.ok(routeSeconds(spawn, findRoute(map, spawn, named(name).door)) <= 4, `${name} is too far from the gate`)
  }
  for (const name of ['Castle', 'Garden', 'Colosseum']) {
    assert.ok(routeSeconds(spawn, findRoute(map, spawn, named(name).door)) <= 12, `${name} is too far from the gate`)
  }
})

test('the town has solid edges, so nobody can walk out of it', () => {
  for (let y = 0; y < map.height; y += 1) {
    assert.ok(!isWalkable(map, -1, y))
    assert.ok(!isWalkable(map, map.width, y))
  }
  for (let x = 0; x < map.width; x += 1) {
    assert.ok(!isWalkable(map, x, -1))
    assert.ok(!isWalkable(map, x, map.height))
    assert.ok(!isWalkable(map, x, map.height - 1))
  }
})

test('the gate and the well cannot be walked through', () => {
  for (let x = map.gate.x; x < map.gate.x + map.gate.width; x += 1) {
    assert.equal(tileAt(x, map.gate.y), TILE.GATE)
    assert.ok(!isWalkable(map, x, map.gate.y))
  }
  assert.ok(!isWalkable(map, map.well.x, map.well.y))
  assert.equal(map.well.y, map.districts.find((item) => item.id === 'residential').y)
})

test('standing on stairs is named as stairs', () => {
  const index = map.tiles.findIndex((tile) => tile === TILE.STAIRS)
  assert.equal(districtNameAt(map, index % map.width, Math.floor(index / map.width)), 'Stairs')
})

test('standing at a landmark door names the landmark, even on its stairs', () => {
  for (const name of ['Castle', 'Garden', 'Colosseum']) {
    const { door } = named(name)
    assert.equal(districtNameAt(map, door.x, door.y), name)
  }
})

test('the row just inside the gate is where the town can be left', () => {
  const map = generateTown()
  const row = gateExitRow(map)
  assert.equal(row, map.gate.y - 1)
  for (let x = map.gate.x; x < map.gate.x + map.gate.width; x += 1) {
    assert.ok(isWalkable(map, x, row))
    assert.ok(isAtGateExit(map, x, row))
  }
  assert.ok(!isAtGateExit(map, map.gate.x - 1, row))
  assert.ok(!isAtGateExit(map, map.gate.x + map.gate.width, row))
  assert.ok(!isAtGateExit(map, map.spawn.x, map.spawn.y))
})

test('only heading down at the gate row leaves the town', () => {
  const map = generateTown()
  const x = map.gate.x + 1
  const row = gateExitRow(map)
  for (const direction of ['down', 'down-left', 'down-right']) assert.ok(isLeavingByGate(map, x, row, direction))
  for (const direction of ['up', 'left', 'right', 'up-left', null]) assert.ok(!isLeavingByGate(map, x, row, direction))
  assert.ok(!isLeavingByGate(map, x, row - 1, 'down'))
})

test('the gate itself and the ground past it count as the gate', () => {
  const map = generateTown()
  assert.ok(isGateTile(map, map.gate.x, map.gate.y))
  assert.ok(isGateTile(map, map.gate.x + map.gate.width - 1, map.height - 1))
  assert.ok(!isGateTile(map, map.gate.x - 1, map.gate.y))
  assert.ok(!isGateTile(map, map.gate.x, map.gate.y - 1))
})
