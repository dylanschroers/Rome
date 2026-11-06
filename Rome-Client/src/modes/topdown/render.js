import { TILE, TILE_SIZE } from '../../world/map.js'
import { walkerPosition } from './walker.js'

// Placeholder colors. Real pixel art replaces all of this in Phase 5.
const COLORS = {
  grass: ['#3b5a34', '#375531', '#3f5f38'],
  cobble: ['#8a7a66', '#7d6e5c'],
  path: ['#75664f', '#6e604a'],
  stairs: ['#8f8678', '#5f584f'],
  treeBase: '#1e3323',
  tree: ['#28472d', '#2d4f33'],
  treeLight: '#35603b',
  wall: ['#4b464d', '#423e45'],
  gate: '#241f24',
  wellStone: '#5f5a58',
  wellWater: '#26404f',
  background: '#131726',
}

const ROOF_HEIGHT = 2

// A small repeatable pattern, so the tiles don't change between page loads.
const pattern = (x, y, size) => ((x * 7 + y * 13 + ((x * y) % 5)) % size + size) % size

function drawTile(ctx, tile, x, y) {
  const left = x * TILE_SIZE
  const top = y * TILE_SIZE

  switch (tile) {
    case TILE.COBBLE:
      ctx.fillStyle = COLORS.cobble[(x + y) % 2]
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = 'rgba(30, 24, 20, 0.25)'
      ctx.fillRect(left, top, TILE_SIZE, 1)
      ctx.fillRect(left, top, 1, TILE_SIZE)
      break
    case TILE.PATH:
      ctx.fillStyle = COLORS.path[pattern(x, y, 2)]
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      break
    case TILE.STAIRS:
      ctx.fillStyle = COLORS.stairs[0]
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = COLORS.stairs[1]
      ctx.fillRect(left, top + 6, TILE_SIZE, 2)
      ctx.fillRect(left, top + 14, TILE_SIZE, 2)
      break
    case TILE.TREE:
      ctx.fillStyle = COLORS.treeBase
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = COLORS.tree[pattern(x, y, 2)]
      ctx.fillRect(left + 2, top + 1, 12, 12)
      ctx.fillStyle = COLORS.treeLight
      ctx.fillRect(left + 4, top + 3, 5, 4)
      break
    case TILE.WALL:
      ctx.fillStyle = COLORS.wall[y % 2]
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      ctx.fillStyle = 'rgba(20, 18, 24, 0.5)'
      ctx.fillRect(left, top + 15, TILE_SIZE, 1)
      ctx.fillRect(left + ((y % 2) * 8), top, 1, TILE_SIZE)
      break
    case TILE.GATE:
      ctx.fillStyle = COLORS.gate
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      break
    case TILE.WELL:
      ctx.fillStyle = COLORS.wellStone
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      break
    default: {
      ctx.fillStyle = COLORS.grass[pattern(x, y, 3)]
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE)
      if (pattern(x, y, 7) === 0) {
        ctx.fillStyle = '#4a6c41'
        ctx.fillRect(left + 5, top + 6, 2, 2)
      }
    }
  }
}

// Draws the whole map once. Each frame then only copies the visible part of it.
export function buildGroundCanvas(map) {
  const canvas = document.createElement('canvas')
  canvas.width = map.width * TILE_SIZE
  canvas.height = map.height * TILE_SIZE
  const ctx = canvas.getContext('2d', { alpha: false })

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      drawTile(ctx, map.tiles[y * map.width + x], x, y)
    }
  }

  ctx.fillStyle = COLORS.wellWater
  ctx.fillRect((map.well.x - 0.5) * TILE_SIZE, (map.well.y - 0.5) * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2)

  return canvas
}

// A red overlay of every blocked tile, used by the debug view.
export function buildSolidCanvas(map) {
  const canvas = document.createElement('canvas')
  canvas.width = map.width * TILE_SIZE
  canvas.height = map.height * TILE_SIZE
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 40, 40, 0.38)'

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.solid[y * map.width + x]) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
    }
  }

  return canvas
}

const LANDMARK_COLORS = {
  castle: { wall: '#6f6b74', top: '#4e4a55', trim: '#8a8590' },
  garden: { wall: '#2f5a2c', top: '#3f7a39', trim: '#c98fa8' },
  colosseum: { wall: '#a38b6a', top: '#7d6a50', trim: '#c4ab86' },
}

function drawDoor(ctx, building, camera, left, wallTop, width, height) {
  const { door } = building
  ctx.fillStyle = '#2c1d13'
  if (door.side === 'bottom') {
    ctx.fillRect(door.x * TILE_SIZE - camera.x + 2, wallTop + height - 16, 12, 16)
  } else if (door.side === 'top') {
    ctx.fillRect(door.x * TILE_SIZE - camera.x + 2, wallTop, 12, 8)
  } else if (door.side === 'left') {
    ctx.fillRect(left, door.y * TILE_SIZE - camera.y + 1, 4, 14)
  } else {
    ctx.fillRect(left + width - 4, door.y * TILE_SIZE - camera.y + 1, 4, 14)
  }
}

function drawLandmark(ctx, building, camera) {
  const left = building.x * TILE_SIZE - camera.x
  const top = building.y * TILE_SIZE - camera.y
  const width = building.width * TILE_SIZE
  const height = building.height * TILE_SIZE
  const colors = LANDMARK_COLORS[building.style]

  ctx.fillStyle = 'rgba(10, 10, 15, 0.3)'
  ctx.fillRect(left - 1, top + height, width + 2, 4)
  ctx.fillStyle = colors.wall
  ctx.fillRect(left, top, width, height)
  ctx.fillStyle = colors.top
  ctx.fillRect(left + 6, top + 6, width - 12, height - 12)
  ctx.fillStyle = colors.trim

  if (building.style === 'castle') {
    for (let x = left; x < left + width; x += 16) ctx.fillRect(x, top - 6, 9, 8)
    ctx.fillRect(left + 4, top + 4, 22, 22)
    ctx.fillRect(left + width - 26, top + 4, 22, 22)
  } else if (building.style === 'garden') {
    for (let y = top + 14; y < top + height - 8; y += 18) {
      for (let x = left + 14; x < left + width - 8; x += 22) ctx.fillRect(x, y, 4, 4)
    }
  } else {
    ctx.fillStyle = '#c4ab86'
    ctx.fillRect(left + 20, top + 20, width - 40, height - 40)
    ctx.fillStyle = colors.top
    for (let x = left + 4; x < left + width - 8; x += 14) ctx.fillRect(x, top + height - 10, 6, 8)
  }

  drawDoor(ctx, building, camera, left, top, width, height)
}

function drawBuilding(ctx, building, camera) {
  if (building.style !== 'house') {
    drawLandmark(ctx, building, camera)
    return
  }

  const left = building.x * TILE_SIZE - camera.x
  const wallTop = building.y * TILE_SIZE - camera.y
  const width = building.width * TILE_SIZE
  const height = building.height * TILE_SIZE
  const roofHeight = ROOF_HEIGHT * TILE_SIZE
  const empty = building.name === 'Empty plot'

  let wall = '#6a5a4c'
  let roof = '#4a2e28'
  if (building.open) {
    wall = '#b39a74'
    roof = '#9b3f33'
  } else if (empty) {
    wall = '#4c4a45'
    roof = '#393836'
  }

  ctx.fillStyle = 'rgba(10, 10, 15, 0.3)'
  ctx.fillRect(left - 1, wallTop + height, width + 2, 3)

  ctx.fillStyle = wall
  ctx.fillRect(left, wallTop, width, height)
  ctx.fillStyle = roof
  ctx.fillRect(left - 2, wallTop - roofHeight, width + 4, roofHeight + 12)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.fillRect(left - 2, wallTop + 8, width + 4, 4)

  if (!empty) {
    ctx.fillStyle = building.open ? '#f0bd71' : '#b8924f'
    ctx.fillRect(left + 8, wallTop + 22, 10, 12)
    ctx.fillRect(left + width - 18, wallTop + 22, 10, 12)
  }

  drawDoor(ctx, building, camera, left, wallTop, width, height)
}

function drawWalker(ctx, walker, camera) {
  const position = walkerPosition(walker)
  const x = Math.round(position.x * TILE_SIZE) - camera.x
  const y = Math.round(position.y * TILE_SIZE) - camera.y
  const phase = walker.moving ? walker.progress : 0
  const bob = walker.moving && phase > 0.25 && phase < 0.75 ? 1 : 0
  const stride = walker.moving ? (walker.steps % 2 === 0 ? 1 : -1) : 0

  ctx.fillStyle = 'rgba(8, 8, 12, 0.35)'
  ctx.fillRect(x + 3, y + 13, 10, 3)

  // Feet alternate as the walker steps.
  ctx.fillStyle = '#2b1f18'
  ctx.fillRect(x + 4, y + 13 + (stride > 0 ? -1 : 0), 3, 3)
  ctx.fillRect(x + 9, y + 13 + (stride < 0 ? -1 : 0), 3, 3)

  const top = y - 4 - bob
  ctx.fillStyle = '#7f2d2c'
  ctx.fillRect(x + 3, top + 8, 10, 9)
  ctx.fillStyle = '#e7c49a'
  ctx.fillRect(x + 4, top, 8, 8)
  ctx.fillStyle = '#4a2e1c'
  ctx.fillRect(x + 4, top, 8, 3)

  // The eyes show which way the walker is facing.
  ctx.fillStyle = '#1a1412'
  if (walker.facing === 'down') {
    ctx.fillRect(x + 5, top + 4, 2, 2)
    ctx.fillRect(x + 9, top + 4, 2, 2)
  } else if (walker.facing === 'left') {
    ctx.fillRect(x + 4, top + 4, 2, 2)
  } else if (walker.facing === 'right') {
    ctx.fillRect(x + 10, top + 4, 2, 2)
  } else {
    ctx.fillStyle = '#4a2e1c'
    ctx.fillRect(x + 4, top + 3, 8, 3)
  }
}

function drawMarker(ctx, marker, camera) {
  const x = marker.x * TILE_SIZE - camera.x
  const y = marker.y * TILE_SIZE - camera.y
  ctx.fillStyle = '#f0bd71'
  ctx.fillRect(x + 2, y + 2, 4, 1)
  ctx.fillRect(x + 2, y + 2, 1, 4)
  ctx.fillRect(x + 10, y + 2, 4, 1)
  ctx.fillRect(x + 13, y + 2, 1, 4)
  ctx.fillRect(x + 2, y + 13, 4, 1)
  ctx.fillRect(x + 2, y + 10, 1, 4)
  ctx.fillRect(x + 10, y + 13, 4, 1)
  ctx.fillRect(x + 13, y + 10, 1, 4)
}

export function drawFrame(ctx, scene) {
  const { map, ground, solidOverlay, walker, camera, layout, marker } = scene

  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.drawImage(ground, -camera.x, -camera.y)

  if (marker) drawMarker(ctx, marker, camera)

  // Draw from the top of the map down, so nearer things cover farther ones.
  const position = walkerPosition(walker)
  const walkerFeet = position.y + 1
  const margin = TILE_SIZE * (ROOF_HEIGHT + 1)
  let walkerDrawn = false

  for (const building of map.buildings) {
    const left = building.x * TILE_SIZE - camera.x
    const top = building.y * TILE_SIZE - camera.y
    const onScreen = left < layout.width
      && left + building.width * TILE_SIZE > 0
      && top - margin < layout.height
      && top + building.height * TILE_SIZE + margin > 0
    building.visible = onScreen
  }

  const ordered = [...map.buildings].sort((a, b) => (a.y + a.height) - (b.y + b.height))
  for (const building of ordered) {
    if (!walkerDrawn && building.y + building.height > walkerFeet) {
      drawWalker(ctx, walker, camera)
      walkerDrawn = true
    }
    if (building.visible) drawBuilding(ctx, building, camera)
  }
  if (!walkerDrawn) drawWalker(ctx, walker, camera)

  if (solidOverlay) ctx.drawImage(solidOverlay, -camera.x, -camera.y)
}

export function drawMiniMap(target, map, ground, walker) {
  const ctx = target.getContext('2d')
  const scale = target.width / map.width

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ground, 0, 0, target.width, target.height)

  for (const building of map.buildings) {
    if (building.open) ctx.fillStyle = '#f0bd71'
    else if (building.id) ctx.fillStyle = '#8a7360'
    else ctx.fillStyle = '#4c4a45'
    ctx.fillRect(building.x * scale, building.y * scale, building.width * scale, building.height * scale)
  }

  ctx.fillStyle = '#fff3d8'
  ctx.strokeStyle = '#2a1b11'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc((walker.x + 0.5) * scale, (walker.y + 0.5) * scale, Math.max(4, scale * 0.9), 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}
