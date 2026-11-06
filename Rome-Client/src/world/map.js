export const TILE_SIZE = 16
export const MAP_WIDTH = 104
export const MAP_HEIGHT = 94

export const TILE = {
  GRASS: 0,
  COBBLE: 1,
  PATH: 2,
  TREE: 3,
  WALL: 4,
  GATE: 5,
  WELL: 6,
  STAIRS: 7,
}

const SOLID_TILES = new Set([TILE.TREE, TILE.WALL, TILE.GATE, TILE.WELL])

const BUILDING_WIDTH = 6
const BUILDING_HEIGHT = 4
const VERGE_TILES = 3
const WALL_TOP = 90

export const DISTRICTS = [
  { id: 'market', name: 'Market', x: 50, y: 76, radius: 9, ring: 13 },
  { id: 'residential', name: 'Residential', x: 54, y: 46, radius: 12, ring: 16 },
]

export const PLACE_GROUPS = [
  { id: 'market', name: 'Market' },
  { id: 'landmarks', name: 'Landmarks' },
]

// Angles are in degrees, clockwise from east, with gaps left where paths leave a plaza.
const PLOTS = [
  { district: 'market', id: 'library', name: 'Library', angle: -115 },
  { district: 'market', id: 'news', name: 'News', angle: -155 },
  { district: 'market', id: 'theater', name: 'Theater', angle: 165 },
  { district: 'market', id: 'school', name: 'School', angle: 15, path: '/school' },
  { district: 'market', id: 'tavern', name: 'Tavern', angle: 125, path: '/tavern' },
  { district: 'market', id: 'garage', name: 'Garage', angle: 55 },
  ...[-150, -120, -60, -30, 30, 60, 120, 150].map((angle) => (
    { district: 'residential', name: 'Empty plot', angle }
  )),
]

const LANDMARKS = [
  { id: 'castle', name: 'Castle', style: 'castle', x: 45, y: 18, width: 18, height: 10, door: { side: 'bottom', x: 54 } },
  { id: 'garden', name: 'Garden', style: 'garden', x: 14, y: 40, width: 14, height: 12, door: { side: 'right', y: 46 } },
  { id: 'colosseum', name: 'Colosseum', style: 'colosseum', x: 77, y: 38, width: 18, height: 18, door: { side: 'left', y: 47 } },
]

const CORRIDORS = [
  { tile: TILE.PATH, x: 49, y: 84, width: 4, height: WALL_TOP - 84 },
  { tile: TILE.STAIRS, x: 50, y: 57, width: 4, height: 11 },
  { tile: TILE.STAIRS, x: 53, y: 28, width: 4, height: 8 },
  { tile: TILE.PATH, x: 28, y: 45, width: 15, height: 4 },
  { tile: TILE.PATH, x: 66, y: 45, width: 11, height: 4 },
  { tile: TILE.PATH, x: 56, y: 70, width: 20, height: 3 },
  { tile: TILE.STAIRS, x: 73, y: 49, width: 3, height: 21 },
]

const indexOf = (x, y) => y * MAP_WIDTH + x

function doorTile(box, door) {
  if (door.side === 'bottom') return { x: door.x, y: box.y + box.height, side: 'bottom' }
  if (door.side === 'top') return { x: door.x, y: box.y - 1, side: 'top' }
  if (door.side === 'left') return { x: box.x - 1, y: door.y, side: 'left' }
  return { x: box.x + box.width, y: door.y, side: 'right' }
}

function placeOnRing(plot) {
  const district = DISTRICTS.find((item) => item.id === plot.district)
  const radians = (plot.angle * Math.PI) / 180
  const centerX = district.x + Math.cos(radians) * district.ring
  const centerY = district.y + Math.sin(radians) * district.ring
  const box = {
    x: Math.round(centerX - BUILDING_WIDTH / 2),
    y: Math.round(centerY - BUILDING_HEIGHT / 2),
    width: BUILDING_WIDTH,
    height: BUILDING_HEIGHT,
  }
  const towardX = district.x - centerX
  const towardY = district.y - centerY
  const midX = box.x + Math.floor(BUILDING_WIDTH / 2)
  const midY = box.y + Math.floor(BUILDING_HEIGHT / 2)

  let side
  if (Math.abs(towardY) >= Math.abs(towardX)) side = towardY > 0 ? 'bottom' : 'top'
  else side = towardX > 0 ? 'right' : 'left'

  return {
    id: plot.id || null,
    name: plot.name,
    district: plot.district,
    style: 'house',
    path: plot.path || null,
    open: Boolean(plot.path),
    ...box,
    door: doorTile(box, { side, x: midX, y: midY }),
  }
}

function placeLandmark(landmark) {
  return {
    id: landmark.id,
    name: landmark.name,
    district: 'landmarks',
    style: landmark.style,
    path: null,
    open: false,
    x: landmark.x,
    y: landmark.y,
    width: landmark.width,
    height: landmark.height,
    door: doorTile(landmark, landmark.door),
  }
}

export function generateTown() {
  const tiles = new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(TILE.TREE)
  const set = (x, y, tile) => {
    if (x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT) tiles[indexOf(x, y)] = tile
  }

  for (const district of DISTRICTS) {
    for (let y = district.y - district.radius; y <= district.y + district.radius; y += 1) {
      for (let x = district.x - district.radius; x <= district.x + district.radius; x += 1) {
        if (Math.hypot(x - district.x, y - district.y) <= district.radius) set(x, y, TILE.COBBLE)
      }
    }
  }

  for (const corridor of CORRIDORS) {
    for (let y = corridor.y; y < corridor.y + corridor.height; y += 1) {
      for (let x = corridor.x; x < corridor.x + corridor.width; x += 1) {
        if (tiles[indexOf(x, y)] !== TILE.COBBLE) set(x, y, corridor.tile)
      }
    }
  }

  // Stairs run through the woods without a grass border, so the levels stay apart.
  const paved = (x, y) => {
    const tile = tiles[indexOf(x, y)]
    return tile === TILE.COBBLE || tile === TILE.PATH
  }
  const grass = []
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (tiles[indexOf(x, y)] !== TILE.TREE) continue
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

  for (let y = WALL_TOP; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) set(x, y, TILE.WALL)
  }
  const road = CORRIDORS[0]
  for (let x = road.x; x < road.x + road.width; x += 1) set(x, WALL_TOP, TILE.GATE)

  const residential = DISTRICTS.find((item) => item.id === 'residential')
  const well = { x: residential.x, y: residential.y }
  for (let y = well.y - 1; y <= well.y + 1; y += 1) {
    for (let x = well.x - 1; x <= well.x + 1; x += 1) set(x, y, TILE.WELL)
  }

  const solid = new Uint8Array(tiles.length)
  tiles.forEach((tile, index) => {
    solid[index] = SOLID_TILES.has(tile) ? 1 : 0
  })

  const buildings = [...PLOTS.map(placeOnRing), ...LANDMARKS.map(placeLandmark)]
  for (const building of buildings) {
    for (let y = building.y; y < building.y + building.height; y += 1) {
      for (let x = building.x; x < building.x + building.width; x += 1) {
        solid[indexOf(x, y)] = 1
        if (tiles[indexOf(x, y)] === TILE.TREE) tiles[indexOf(x, y)] = TILE.GRASS
      }
    }
  }

  const areas = [
    ...DISTRICTS.map((district) => ({ name: district.name, x: district.x, y: district.y, reach: district.ring + 2 })),
    ...LANDMARKS.map((landmark) => ({
      name: landmark.name,
      x: landmark.x + landmark.width / 2,
      y: landmark.y + landmark.height / 2,
      reach: Math.max(landmark.width, landmark.height) / 2 + 3,
    })),
  ]

  const doorsteps = new Map(
    buildings
      .filter((building) => building.district === 'landmarks')
      .map((building) => [indexOf(building.door.x, building.door.y), building.name]),
  )

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    doorsteps,
    solid,
    buildings,
    districts: DISTRICTS,
    groups: PLACE_GROUPS,
    areas,
    well,
    corridors: CORRIDORS,
    gate: { x: road.x, y: WALL_TOP, width: road.width },
    spawn: { x: road.x + 1, y: WALL_TOP - 2, facing: 'up' },
  }
}

export function isWalkable(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
  return map.solid[indexOf(x, y)] === 0
}

export function canStep(map, x, y, dx, dy) {
  if (!isWalkable(map, x + dx, y + dy)) return false
  if (dx === 0 || dy === 0) return true
  return isWalkable(map, x + dx, y) && isWalkable(map, x, y + dy)
}

export function districtNameAt(map, x, y) {
  const doorstep = map.doorsteps.get(indexOf(x, y))
  if (doorstep) return doorstep
  if (map.tiles[indexOf(x, y)] === TILE.STAIRS) return 'Stairs'
  let best = null
  let bestGap = Infinity
  for (const area of map.areas) {
    const gap = Math.hypot(x - area.x, y - area.y)
    if (gap <= area.reach && gap < bestGap) {
      best = area
      bestGap = gap
    }
  }
  return best ? best.name : 'The road'
}

const isUnderGate = (map, x) => x >= map.gate.x && x < map.gate.x + map.gate.width

export const gateExitRow = (map) => map.gate.y - 1

export function isAtGateExit(map, x, y) {
  return y === gateExitRow(map) && isUnderGate(map, x)
}

export function isLeavingByGate(map, x, y, direction) {
  return isAtGateExit(map, x, y) && typeof direction === 'string' && direction.startsWith('down')
}

export function isGateTile(map, x, y) {
  return y >= map.gate.y && isUnderGate(map, x)
}
