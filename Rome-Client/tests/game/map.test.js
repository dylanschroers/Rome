import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, TILE, generateTown, isWalkable } from '../../src/game/map.js'
import { findRoute } from '../../src/game/route.js'
import { routeSeconds } from '../../src/game/walker.js'

const map = generateTown()
const spawn = map.spawn

function reachableFromSpawn(x, y) {
  if (x === spawn.x && y === spawn.y) return true
  const route = findRoute(map, spawn, { x, y })
  const last = route[route.length - 1]
  return Boolean(last) && last.x === x && last.y === y
}

test('the map has the planned size and three districts', () => {
  assert.equal(map.width, 96)
  assert.equal(map.height, 40)
  assert.equal(map.tiles.length, MAP_WIDTH * MAP_HEIGHT)
  assert.deepEqual(map.districts.map((item) => item.name), ['Scholars', 'Forum', 'Market row'])
})

test('the visitor starts on a walkable tile just inside the gate', () => {
  assert.ok(isWalkable(map, spawn.x, spawn.y))
  assert.ok(spawn.y < map.gate.y)
  assert.ok(spawn.x >= map.gate.x && spawn.x < map.gate.x + map.gate.width)
})

test('nothing in town is a long walk away', () => {
  const doors = map.buildings.filter((item) => item.open).map((item) => item.door)
  for (const door of doors) {
    assert.ok(routeSeconds(spawn, findRoute(map, spawn, door)) <= 8, 'gate to a working place takes too long')
    for (const other of doors) {
      assert.ok(routeSeconds(door, findRoute(map, door, other)) <= 11, 'walk between places takes too long')
    }
  }
})

test('every plaza can be reached from the gate', () => {
  for (const district of DISTRICTS) {
    // The Forum's center holds the well, so check just beside it.
    const x = district.x + 3
    assert.ok(reachableFromSpawn(x, district.y), `${district.name} is unreachable`)
  }
})

test('every building door can be reached from the gate', () => {
  assert.equal(map.buildings.length, 17)
  for (const building of map.buildings) {
    const { door } = building
    assert.ok(isWalkable(map, door.x, door.y), `${building.name} door is blocked`)
    assert.ok(reachableFromSpawn(door.x, door.y), `${building.name} door is unreachable`)
  }
})

test('the three working places are open and in the planned districts', () => {
  const open = map.buildings.filter((item) => item.open).map((item) => [item.name, item.district])
  assert.deepEqual(open, [
    ['School', 'scholars'],
    ['Message board', 'forum'],
    ['Language stall', 'market'],
  ])
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

test('buildings leave the paths between plazas clear', () => {
  for (let x = 26; x < 38; x += 1) assert.ok(isWalkable(map, x, 17), `path blocked at ${x},17`)
  for (let x = 54; x < 66; x += 1) assert.ok(isWalkable(map, x, 17), `path blocked at ${x},17`)
  for (let y = 25; y < 36; y += 1) assert.ok(isWalkable(map, 45, y), `road blocked at 45,${y}`)
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
    assert.equal(map.tiles[map.gate.y * map.width + x], TILE.GATE)
    assert.ok(!isWalkable(map, x, map.gate.y))
  }
  assert.ok(!isWalkable(map, 46, 17))
})
