import { createKeyStack, directionForKey } from './keys.js'
import { districtNameAt, generateTown } from './map.js'
import { buildGroundCanvas, buildSolidCanvas, drawFrame } from './render.js'
import { findRoute } from './route.js'
import { computeCamera, computeLayout, screenToTile } from './view.js'
import { createWalker, routeStart, stepWalker, walkerPosition } from './walker.js'

const TICK_MS = 1000 / 60
const LONGEST_FRAME_MS = 100
const TAP_DISTANCE_PX = 12
const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

// Starts the game on a canvas and returns a function that stops it and cleans up.
// React only mounts this; game state stays in here and never re-renders the page.
export function createGame({ canvas, container, labels, onDistrict, onFirstMove, onDebug, debug: startDebug }) {
  const map = generateTown()
  const ctx = canvas.getContext('2d', { alpha: false })
  const ground = buildGroundCanvas(map)
  const keys = createKeyStack()
  const walker = createWalker(map.spawn.x, map.spawn.y, map.spawn.facing)

  let layout = null
  let camera = { x: 0, y: 0 }
  let marker = null
  let frame = null
  let lastTime = 0
  let leftover = 0
  let dirty = true
  let district = null
  let moved = false
  let debug = Boolean(startDebug)
  let solidOverlay = debug ? buildSolidCanvas(map) : null
  let pointer = null
  let frames = 0
  let framesSince = 0
  let fps = 0
  let slowestFrame = 0

  function placeLabels() {
    labels.style.setProperty('--game-pixel', `${layout.cssPerPixel}px`)
  }

  function moveLabels() {
    labels.style.transform = `translate3d(${-camera.x * layout.cssPerPixel}px, ${-camera.y * layout.cssPerPixel}px, 0)`
  }

  function resize() {
    const box = container.getBoundingClientRect()
    if (!box.width || !box.height) return

    layout = computeLayout(box.width, box.height, window.devicePixelRatio || 1)
    canvas.width = layout.width
    canvas.height = layout.height
    canvas.style.width = `${layout.width * layout.cssPerPixel}px`
    canvas.style.height = `${layout.height * layout.cssPerPixel}px`
    ctx.imageSmoothingEnabled = false
    placeLabels()
    dirty = true
  }

  function reportDebug() {
    if (!debug) return
    onDebug({
      fps,
      slowestFrame: Math.round(slowestFrame),
      tile: `${walker.x}, ${walker.y}`,
      scale: layout.scale,
      view: `${layout.width} x ${layout.height}`,
      route: walker.route.length,
    })
  }

  function update(elapsed) {
    leftover += Math.min(elapsed, LONGEST_FRAME_MS)
    const held = keys.current()

    if (held && marker) {
      marker = null
      dirty = true
    }

    while (leftover >= TICK_MS) {
      const beforeX = walker.x
      const beforeY = walker.y
      const wasMoving = walker.moving
      const facing = walker.facing
      stepWalker(walker, map, held, TICK_MS)
      leftover -= TICK_MS
      keys.used()

      if (walker.moving || wasMoving || facing !== walker.facing
        || beforeX !== walker.x || beforeY !== walker.y) {
        dirty = true
      }
    }

    if (marker && !walker.moving && walker.route.length === 0) {
      marker = null
      dirty = true
    }

    if (!moved && walker.moving) {
      moved = true
      onFirstMove()
    }

    const name = districtNameAt(map, walker.x, walker.y)
    if (name !== district) {
      district = name
      onDistrict(name)
    }
  }

  function render() {
    camera = computeCamera(walkerPosition(walker), layout, map)
    drawFrame(ctx, { map, ground, solidOverlay, walker, camera, layout, marker })
    moveLabels()
    dirty = false
  }

  function loop(now) {
    frame = requestAnimationFrame(loop)
    const elapsed = now - lastTime
    lastTime = now

    frames += 1
    slowestFrame = Math.max(slowestFrame, elapsed)
    if (now - framesSince >= 500) {
      fps = Math.round((frames * 1000) / (now - framesSince))
      frames = 0
      framesSince = now
      reportDebug()
      slowestFrame = 0
    }

    if (!layout) return
    update(elapsed)
    if (dirty) render()
  }

  function start() {
    if (frame !== null) return
    lastTime = performance.now()
    framesSince = lastTime
    frames = 0
    leftover = 0
    frame = requestAnimationFrame(loop)
  }

  function stop() {
    if (frame === null) return
    cancelAnimationFrame(frame)
    frame = null
  }

  const onKeyDown = (event) => {
    if (TEXT_ENTRY.has(event.target?.tagName)) return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (event.code === 'Backquote') {
      debug = !debug
      solidOverlay = debug ? (solidOverlay || buildSolidCanvas(map)) : null
      onDebug(debug ? {} : null)
      dirty = true
      return
    }

    if (directionForKey(event.code)) {
      event.preventDefault()
      keys.press(event.code)
    }
  }

  const onKeyUp = (event) => keys.release(event.code)

  const releaseEverything = () => keys.clear()

  const onVisibility = () => {
    keys.clear()
    if (document.hidden) stop()
    else start()
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event) => {
    if (!pointer || event.pointerId !== pointer.id || !layout) return
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
    pointer = null
    if (distance > TAP_DISTANCE_PX) return

    const box = canvas.getBoundingClientRect()
    const target = screenToTile(event.clientX - box.left, event.clientY - box.top, layout, camera)
    const route = findRoute(map, routeStart(walker), target)
    walker.route = route
    keys.clear()
    marker = route.length ? route[route.length - 1] : null
    dirty = true
  }

  const onPointerCancel = () => {
    pointer = null
  }

  const observer = new ResizeObserver(resize)
  observer.observe(container)
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', releaseEverything)
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)

  resize()
  if (debug) onDebug({})

  // Draw straight away, so the town shows even before the browser's first frame.
  if (layout) {
    update(0)
    render()
  }

  if (!document.hidden) start()

  return {
    map,
    // Read-only look at the game, used by the debug view and automated checks.
    inspect: () => ({
      x: walker.x,
      y: walker.y,
      moving: walker.moving,
      facing: walker.facing,
      route: walker.route.length,
      camera: { ...camera },
      layout: layout && { ...layout },
      marker,
      running: frame !== null,
    }),
    destroy() {
      stop()
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseEverything)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
    },
  }
}
