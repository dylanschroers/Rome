import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TILE_SIZE, generateTown } from '../../src/game/map.js'
import { computeCamera, computeLayout, screenToTile } from '../../src/game/view.js'

const map = generateTown()

test('the scale is always a whole number and at least one', () => {
  for (const [width, height, ratio] of [[1600, 900, 1], [1440, 900, 2], [375, 812, 3], [320, 480, 2], [100, 100, 1]]) {
    const layout = computeLayout(width, height, ratio)
    assert.ok(Number.isInteger(layout.scale) && layout.scale >= 1)
  }
})

test('the canvas fills the screen at the chosen scale', () => {
  for (const [width, height, ratio] of [[1600, 900, 1], [1440, 900, 2], [375, 812, 3], [812, 375, 3], [1920, 1080, 1.5]]) {
    const layout = computeLayout(width, height, ratio)
    assert.ok(layout.width * layout.cssPerPixel >= width - 0.01)
    assert.ok(layout.height * layout.cssPerPixel >= height - 0.01)
  }
})

test('common screens get a useful view of the town', () => {
  const desktop = computeLayout(1600, 900, 1)
  assert.equal(desktop.scale, 3)
  assert.equal(desktop.width, 534)
  assert.equal(desktop.height, 300)

  const phone = computeLayout(375, 812, 3)
  assert.ok(phone.width >= 240, 'a phone should still show at least 15 tiles across')
  assert.ok(phone.height >= 160)
  assert.ok(16 * phone.cssPerPixel >= 16, 'phone tiles should stay large enough to see and tap')
})

test('the camera stays on whole pixels and centers on the walker', () => {
  const layout = computeLayout(1600, 900, 1)
  const camera = computeCamera({ x: 46.37, y: 20.61 }, layout, map)
  assert.ok(Number.isInteger(camera.x) && Number.isInteger(camera.y))
  assert.ok(Math.abs(camera.x + layout.width / 2 - (46.87 * TILE_SIZE)) <= 1)
  assert.ok(Math.abs(camera.y + layout.height / 2 - (21.11 * TILE_SIZE)) <= 1)
})

test('the camera stops at the map edges', () => {
  const layout = computeLayout(1600, 900, 1)
  const corner = computeCamera({ x: 0, y: 0 }, layout, map)
  assert.deepEqual(corner, { x: 0, y: 0 })

  const far = computeCamera({ x: map.width - 1, y: map.height - 1 }, layout, map)
  assert.equal(far.x, map.width * TILE_SIZE - layout.width)
  assert.equal(far.y, map.height * TILE_SIZE - layout.height)
})

test('a map smaller than the screen is centered', () => {
  const layout = computeLayout(6000, 3000, 1)
  const huge = { ...layout, scale: 1, width: 6000, height: 3000 }
  const camera = computeCamera({ x: 10, y: 10 }, huge, map)
  assert.equal(camera.x, Math.round((map.width * TILE_SIZE - 6000) / 2))
  assert.equal(camera.y, Math.round((map.height * TILE_SIZE - 3000) / 2))
})

test('a tap on the screen maps to the tile under it', () => {
  const layout = computeLayout(1600, 900, 1)
  const camera = { x: 160, y: 320 }
  const tile = screenToTile(layout.cssPerPixel * (TILE_SIZE * 2 + 3), layout.cssPerPixel * (TILE_SIZE + 3), layout, camera)
  assert.deepEqual(tile, { x: 12, y: 21 })
})

test('tap mapping works on a high-density phone', () => {
  const layout = computeLayout(375, 812, 3)
  const camera = { x: 0, y: 0 }
  const tile = screenToTile(TILE_SIZE * layout.cssPerPixel * 3.5, TILE_SIZE * layout.cssPerPixel * 2.5, layout, camera)
  assert.deepEqual(tile, { x: 3, y: 2 })
})
