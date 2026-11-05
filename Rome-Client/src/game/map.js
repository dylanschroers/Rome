// The town map, generated from the short lists below so its layout is easy to
// change. This file has no browser dependencies, so it can run in tests.
export const TILE_SIZE = 16
export const MAP_WIDTH = 96
export const MAP_HEIGHT = 40

export const TILE = {
  GRASS: 0,
  COBBLE: 1,
  PATH: 2,
  TREE: 3,
  WALL: 4,
  GATE: 5,
  WELL: 6,
}

const SOLID_TILES = new Set([TILE.TREE, TILE.WALL, TILE.GATE, TILE.WELL])

const PLAZA_RADIUS = 8
const BUILDING_DISTANCE = 12
const BUILDING_WIDTH = 6
const BUILDING_HEIGHT = 4
const VERGE_TILES = 3
const WALL_TOP = 36

export const DISTRICTS = [
  { id: 'scholars', name: 'Scholars', x: 18, y: 17 },
  { id: 'forum', name: 'Forum', x: 46, y: 17 },
  { id: 'market', name: 'Market row', x: 74, y: 17 },
]

// Angles are in degrees, clockwise from east. East, west, and south are left open
// where a path meets the plaza.
const PLOTS = [
  { district: 'scholars', id: 'school', name: 'School', angle: -90, path: '/school' },
  { district: 'scholars', id: 'library', name: 'Library', angle: -140 },
  { district: 'scholars', id: 'temple', name: 'Temple', angle: 180 },
  { district: 'scholars', name: 'Empty plot', angle: 140 },
  { district: 'scholars', name: 'Empty plot', angle: 40 },
  { district: 'scholars', name: 'Empty plot', angle: -40 },
  { district: 'forum', id: 'message-board', name: 'Message board', angle: -90, path: '/messages' },
  { district: 'forum', id: 'homes', name: 'Homes', angle: -140 },
  { district: 'forum', id: 'senate', name: 'Senate', angle: -40 },
  { district: 'forum', id: 'theater', name: 'Theater', angle: 140 },
  { district: 'forum', id: 'arena', name: 'Arena', angle: 40 },
  { district: 'market', id: 'language-stall', name: 'Language stall', angle: -90, path: '/school/languages' },
  { district: 'market', id: 'smithy', name: 'Smithy', angle: -40 },
  { district: 'market', name: 'Empty plot', angle: -140 },
  { district: 'market', name: 'Empty plot', angle: 40 },
  { district: 'market', name: 'Empty plot', angle: 140 },
  { district: 'market', name: 'Empty plot', angle: 0 },
]

const PATHS = [
  { x: 26, y: 16, width: 12, height: 4 },
  { x: 54, y: 16, width: 12, height: 4 },
  { x: 44, y: 25, width: 4, height: WALL_TOP - 25 },
]

const indexOf = (x, y) => y * MAP_WIDTH + x

function placeBuilding(plot) {
  const district = DISTRICTS.find((item) => item.id === plot.district)
  const radians = (plot.angle * Math.PI) / 180
  const centerX = district.x + Math.cos(radians) * BUILDING_DISTANCE
  const centerY = district.y + Math.sin(radians) * BUILDING_DISTANCE
  const x = Math.round(centerX - BUILDING_WIDTH / 2)
  const y = Math.round(centerY - BUILDING_HEIGHT / 2)
  const towardX = district.x - centerX
  const towardY = district.y - centerY
  const midX = x + Math.floor(BUILDING_WIDTH / 2)
  const midY = y + Math.floor(BUILDING_HEIGHT / 2)

  // The door faces the plaza. `door` is the tile you stand on to use it.
  let door
  if (Math.abs(towardY) >= Math.abs(towardX)) {
    door = towardY > 0
      ? { x: midX, y: y + BUILDING_HEIGHT, side: 'bottom' }
      : { x: midX, y: y - 1, side: 'top' }
  } else {
    door = towardX > 0
      ? { x: x + BUILDING_WIDTH, y: midY, side: 'right' }
      : { x: x - 1, y: midY, side: 'left' }
  }

  return {
    id: plot.id || null,
    name: plot.name,
    district: plot.district,
    path: plot.path || null,
    open: Boolean(plot.path),
    x,
    y,
    width: BUILDING_WIDTH,
    height: BUILDING_HEIGHT,
    door,
  }
}

export function generateTown() {
  const tiles = new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(TILE.TREE)
  const set = (x, y, tile) => {
    if (x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT) tiles[indexOf(x, y)] = tile
  }

  for (const district of DISTRICTS) {
    for (let y = district.y - PLAZA_RADIUS; y <= district.y + PLAZA_RADIUS; y += 1) {
      for (let x = district.x - PLAZA_RADIUS; x <= district.x + PLAZA_RADIUS; x += 1) {
        if (Math.hypot(x - district.x, y - district.y) <= PLAZA_RADIUS) set(x, y, TILE.COBBLE)
      }
    }
  }

  for (const path of PATHS) {
    for (let y = path.y; y < path.y + path.height; y += 1) {
      for (let x = path.x; x < path.x + path.width; x += 1) {
        if (tiles[indexOf(x, y)] !== TILE.COBBLE) set(x, y, TILE.PATH)
      }
    }
  }

  // Grass borders everything paved, and woods fill the rest of the map.
  const paved = (x, y) => {
    const tile = tiles[indexOf(x, y)]
    return tile === TILE.COBBLE || tile === TILE.PATH
  }
  const grass = []
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (paved(x, y)) continue
      let nearPaved = false
      for (let dy = -VERGE_TILES; dy <= VERGE_TILES && !nearPaved; dy += 1) {
        for (let dx = -VERGE_TILES; dx <= VERGE_TILES && !nearPaved; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue
          if (Math.hypot(dx, dy) <= VERGE_TILES && paved(nx, ny)) nearPaved = true
        }
      }
      if (nearPaved) grass.push([x, y])
    }
  }
  grass.forEach(([x, y]) => set(x, y, TILE.GRASS))

  // The city wall runs along the south edge, with the gate where the road ends.
  for (let y = WALL_TOP; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) set(x, y, TILE.WALL)
  }
  const road = PATHS[2]
  for (let x = road.x; x < road.x + road.width; x += 1) set(x, WALL_TOP, TILE.GATE)

  // The Forum's well is a small landmark in the middle of the plaza.
  const forum = DISTRICTS.find((item) => item.id === 'forum')
  for (let y = forum.y - 1; y <= forum.y + 1; y += 1) {
    for (let x = forum.x - 1; x <= forum.x + 1; x += 1) set(x, y, TILE.WELL)
  }

  const solid = new Uint8Array(tiles.length)
  tiles.forEach((tile, index) => {
    solid[index] = SOLID_TILES.has(tile) ? 1 : 0
  })

  const buildings = PLOTS.map(placeBuilding)
  for (const building of buildings) {
    for (let y = building.y; y < building.y + building.height; y += 1) {
      for (let x = building.x; x < building.x + building.width; x += 1) {
        solid[indexOf(x, y)] = 1
        // Anything under a building that isn't paved is just open ground.
        if (tiles[indexOf(x, y)] === TILE.TREE) tiles[indexOf(x, y)] = TILE.GRASS
      }
    }
  }

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    solid,
    buildings,
    districts: DISTRICTS,
    gate: { x: road.x, y: WALL_TOP, width: road.width },
    spawn: { x: road.x + 1, y: WALL_TOP - 2, facing: 'up' },
  }
}

export function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
  return map.solid[indexOf(x, y)] === 0
}

// Whether a walker can move by this offset. A diagonal also needs both sides of the
// corner clear, so nobody squeezes between two touching walls.
export function canStep(map, x, y, dx, dy) {
  if (!isWalkable(map, x + dx, y + dy)) return false
  if (dx === 0 || dy === 0) return true
  return isWalkable(map, x + dx, y) && isWalkable(map, x, y + dy)
}

export function districtNameAt(map, x, y) {
  const district = map.districts.find((item) => (
    Math.hypot(x - item.x, y - item.y) <= BUILDING_DISTANCE + 2
  ))
  return district ? district.name : 'The road'
}
