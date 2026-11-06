import { TILE } from '../../world/map.js'

const INK = '#4a3b2b'
const COLORS = {
  forest: '#a4ad7c',
  forestShade: '#8b9665',
  tree: '#7f8c58',
  grass: '#dcd5a6',
  stone: '#d3c19c',
  stoneLine: '#b9a47d',
  wall: '#a8a093',
  water: '#86a9b4',
}

function jitter(x, y, salt) {
  const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453
  return value - Math.floor(value)
}

function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return TILE.TREE
  return map.tiles[y * map.width + x]
}

function nearClearing(map, x, y, reach) {
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      if (tileAt(map, x + dx, y + dy) !== TILE.TREE) return true
    }
  }
  return false
}

function drawForest(ctx, map, bounds) {
  ctx.fillStyle = COLORS.forest
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)

  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      if (tileAt(map, x, y) !== TILE.TREE) continue
      const edge = nearClearing(map, x, y, 2)
      if (!edge && jitter(x, y, 5) < 0.55) continue
      const cx = x + 0.5 + (jitter(x, y, 1) - 0.5) * 0.5
      const cy = y + 0.5 + (jitter(x, y, 2) - 0.5) * 0.5
      const radius = edge ? 0.6 + jitter(x, y, 3) * 0.25 : 0.4 + jitter(x, y, 3) * 0.2
      ctx.fillStyle = edge && jitter(x, y, 4) > 0.5 ? COLORS.tree : COLORS.forestShade
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawClearings(ctx, map) {
  ctx.fillStyle = COLORS.grass
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = tileAt(map, x, y)
      if (tile === TILE.TREE || tile === TILE.WALL || tile === TILE.GATE) continue
      ctx.beginPath()
      ctx.arc(x + 0.5, y + 0.5, 0.95, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawPlazas(ctx, map) {
  for (const district of map.districts) {
    ctx.fillStyle = COLORS.stone
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.22
    ctx.beginPath()
    ctx.arc(district.x + 0.5, district.y + 0.5, district.radius + 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = COLORS.stoneLine
    ctx.lineWidth = 0.12
    for (let ring = 2.5; ring < district.radius; ring += 2.5) {
      ctx.beginPath()
      ctx.arc(district.x + 0.5, district.y + 0.5, ring, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

function drawCorridors(ctx, map) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, map.width, map.height)
  for (const district of map.districts) {
    ctx.moveTo(district.x + 0.5 + district.radius + 0.3, district.y + 0.5)
    ctx.arc(district.x + 0.5, district.y + 0.5, district.radius + 0.3, 0, Math.PI * 2)
  }
  ctx.clip('evenodd')

  ctx.strokeStyle = INK
  ctx.lineWidth = 0.36
  for (const { x, y, width, height } of map.corridors) ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = COLORS.stone
  for (const { x, y, width, height } of map.corridors) ctx.fillRect(x, y, width, height)

  ctx.strokeStyle = COLORS.stoneLine
  ctx.lineWidth = 0.14
  ctx.beginPath()
  for (const { tile, x, y, width, height } of map.corridors) {
    if (tile !== TILE.STAIRS) continue
    for (let row = y + 0.5; row < y + height; row += 0.6) {
      ctx.moveTo(x + 0.2, row)
      ctx.lineTo(x + width - 0.2, row)
    }
  }
  ctx.stroke()
  ctx.restore()
}

function drawWall(ctx, map) {
  const top = map.gate.y
  ctx.fillStyle = COLORS.wall
  ctx.fillRect(0, top, map.width, map.height - top)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.22
  ctx.beginPath()
  ctx.moveTo(0, top)
  ctx.lineTo(map.gate.x, top)
  ctx.moveTo(map.gate.x + map.gate.width, top)
  ctx.lineTo(map.width, top)
  ctx.stroke()

  ctx.fillStyle = INK
  for (let x = 0.5; x < map.width; x += 2) {
    if (x > map.gate.x - 1 && x < map.gate.x + map.gate.width + 0.5) continue
    ctx.fillRect(x, top + 0.35, 1, 0.5)
  }
}

function drawWell(ctx, map) {
  ctx.fillStyle = COLORS.water
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.2
  ctx.beginPath()
  ctx.arc(map.well.x + 0.5, map.well.y + 0.5, 1.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawEdge(ctx, bounds) {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const gradient = ctx.createRadialGradient(cx, cy, Math.min(bounds.width, bounds.height) * 0.4, cx, cy, Math.max(bounds.width, bounds.height) * 0.75)
  gradient.addColorStop(0, 'rgba(201, 179, 138, 0)')
  gradient.addColorStop(1, 'rgba(120, 96, 60, 0.4)')
  ctx.fillStyle = gradient
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
}

const BOUNDS_MARGIN = 3

// The part of the map worth showing: everything that isn't deep forest, plus a little woods around it.
export function mapBounds(map) {
  let left = map.width
  let top = map.height
  let right = 0
  let bottom = 0
  const include = (x, y) => {
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x + 1)
    bottom = Math.max(bottom, y + 1)
  }
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = tileAt(map, x, y)
      if (tile !== TILE.TREE && tile !== TILE.WALL) include(x, y)
    }
  }
  for (const building of map.buildings) {
    include(building.x, building.y - 3)
    include(building.x + building.width - 1, building.y + building.height - 1)
  }
  const x = Math.max(0, left - BOUNDS_MARGIN)
  const y = Math.max(0, top - BOUNDS_MARGIN)
  return {
    x,
    y,
    width: Math.min(map.width, right + BOUNDS_MARGIN) - x,
    height: map.height - y,
  }
}

// Paints everything that never changes: woods, clearings, plazas, roads, stairs and the wall.
// Buildings are drawn separately so they can be clicked.
export function drawMapArt(canvas, map, bounds, pixelsPerTile) {
  canvas.width = Math.round(bounds.width * pixelsPerTile)
  canvas.height = Math.round(bounds.height * pixelsPerTile)
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.setTransform(pixelsPerTile, 0, 0, pixelsPerTile, -bounds.x * pixelsPerTile, -bounds.y * pixelsPerTile)
  drawForest(ctx, map, bounds)
  drawClearings(ctx, map)
  drawPlazas(ctx, map)
  drawCorridors(ctx, map)
  drawWell(ctx, map)
  drawWall(ctx, map)
  drawEdge(ctx, bounds)
}
