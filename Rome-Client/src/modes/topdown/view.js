import { TILE_SIZE } from '../../world/map.js'

// The game always shows at least this many low-resolution pixels each way. Larger
// screens show more of the town, and small ones stay zoomed in enough to read.
const WIDE_VIEW = { width: 400, height: 240 }
const SMALL_VIEW = { width: 240, height: 160 }
const WIDE_SCREEN_CSS = 700

// Chooses a whole-number scale so pixels stay crisp, and how large the low-resolution
// canvas must be to fill the screen at that scale.
export function computeLayout(cssWidth, cssHeight, devicePixelRatio) {
  const deviceWidth = cssWidth * devicePixelRatio
  const deviceHeight = cssHeight * devicePixelRatio
  const view = cssWidth >= WIDE_SCREEN_CSS ? WIDE_VIEW : SMALL_VIEW
  const scale = Math.max(1, Math.floor(Math.min(
    deviceWidth / view.width,
    deviceHeight / view.height,
  )))

  return {
    scale,
    width: Math.ceil(deviceWidth / scale),
    height: Math.ceil(deviceHeight / scale),
    cssPerPixel: scale / devicePixelRatio,
  }
}

function cameraAxis(center, viewSize, mapSize) {
  if (mapSize <= viewSize) return Math.round((mapSize - viewSize) / 2)
  return Math.max(0, Math.min(mapSize - viewSize, Math.round(center - viewSize / 2)))
}

// The top-left corner of the view, in low-resolution pixels. It follows the given
// position in tiles, stops at the map edges, and centers a map smaller than the view.
export function computeCamera(position, layout, map) {
  return {
    x: cameraAxis((position.x + 0.5) * TILE_SIZE, layout.width, map.width * TILE_SIZE),
    y: cameraAxis((position.y + 0.5) * TILE_SIZE, layout.height, map.height * TILE_SIZE),
  }
}

// Converts a point on the screen, measured from the canvas corner, into a map tile.
export function screenToTile(cssX, cssY, layout, camera) {
  return {
    x: Math.floor((cssX / layout.cssPerPixel + camera.x) / TILE_SIZE),
    y: Math.floor((cssY / layout.cssPerPixel + camera.y) / TILE_SIZE),
  }
}
