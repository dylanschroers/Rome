import { createKeyStack, directionForKey } from './keys.js'
import { districtNameAt, generateTown } from './map.js'
import { doorStart, findPlace, placeNear, placeUnderTile } from './places.js'
import { buildGroundCanvas, buildSolidCanvas, drawFrame, drawMiniMap } from './render.js'
import { findRoute } from './route.js'
import { computeCamera, computeLayout, screenToTile } from './view.js'
import { createWalker, placeWalker, routeStart, stepWalker, walkerPosition } from './walker.js'

const TICK_MS = 1000 / 60
const LONGEST_FRAME_MS = 100
const TAP_DISTANCE_PX = 12
const AUTO_RUN_TILES = 12
const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const ENTER_KEYS = new Set(['KeyE', 'Enter', 'Space'])
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight'])

// Starts the game on a canvas and returns a function that stops it and cleans up.
// React only mounts this; game state stays in here and never re-renders the page.
export function createGame({
  canvas,
  container,
  labels,
  startAt,
  onDistrict,
  onFirstMove,
  onNearby,
  onEnterPlace,
  onOpenPlaces,
  onDebug,
  debug: startDebug,
}) {
  const map = generateTown()
  const ctx = canvas.getContext('2d', { alpha: false })
  const ground = buildGroundCanvas(map)
  const keys = createKeyStack()
  const startPlace = findPlace(map, startAt)
  const startTile = startPlace ? doorStart(startPlace) : map.spawn
  const walker = createWalker(startTile.x, startTile.y, startTile.facing)

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
  let running = false
  let paused = false
  let nearby = null
  let pendingPlace = null

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

    if (held) pendingPlace = null

    if (held && marker) {
      marker = null
      dirty = true
    }

    while (leftover >= TICK_MS) {
      const beforeX = walker.x
      const beforeY = walker.y
      const wasMoving = walker.moving
      const facing = walker.facing
      stepWalker(walker, map, held, TICK_MS, running)
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

    const near = placeNear(map, walker.x, walker.y)
    if (near !== nearby) {
      nearby = near
      onNearby(near)
    }

    if (pendingPlace && !walker.moving && walker.route.length === 0) {
      const place = pendingPlace
      pendingPlace = null
      if (near === place) onEnterPlace(place)
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
    if (!paused) update(elapsed)
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

    if (paused) return

    if (RUN_KEYS.has(event.code)) {
      running = true
      return
    }

    if (event.code === 'KeyM') {
      onOpenPlaces()
      return
    }

    if (ENTER_KEYS.has(event.code)) {
      if (event.target?.closest?.('button, a') && event.code !== 'KeyE') return
      if (nearby?.open && !event.repeat) {
        event.preventDefault()
        onEnterPlace(nearby)
      }
      return
    }

    if (directionForKey(event.code)) {
      event.preventDefault()
      keys.press(event.code)
    }
  }

  const onKeyUp = (event) => {
    if (RUN_KEYS.has(event.code)) running = false
    keys.release(event.code)
  }

  const releaseEverything = () => {
    keys.clear()
    running = false
  }

  const onVisibility = () => {
    releaseEverything()
    if (document.hidden) stop()
    else start()
  }

  const onPointerDown = (event) => {
    if (event.button !== 0 || paused) return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event) => {
    if (!pointer || event.pointerId !== pointer.id || !layout) return
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
    pointer = null
    if (distance > TAP_DISTANCE_PX) return

    const box = canvas.getBoundingClientRect()
    const target = screenToTile(event.clientX - box.left, event.clientY - box.top, layout, camera)
    const place = placeUnderTile(map, target.x, target.y)
    const route = findRoute(map, routeStart(walker), place ? place.door : target)
    walker.route = route
    walker.autoRun = route.length > AUTO_RUN_TILES
    keys.clear()
    pendingPlace = place?.open ? place : null
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
    enterNearby() {
      if (nearby?.open) onEnterPlace(nearby)
    },
    travelTo(id) {
      const place = findPlace(map, id)
      if (!place) return
      const door = doorStart(place)
      placeWalker(walker, door.x, door.y, door.facing)
      marker = null
      pendingPlace = null
      if (layout) {
        update(0)
        render()
      }
    },
    setPaused(value) {
      paused = value
      leftover = 0
      releaseEverything()
    },
    drawMiniMap(target) {
      drawMiniMap(target, map, ground, walker)
    },
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
      paused,
      nearby: nearby?.id ?? null,
      runningKey: running,
      autoRun: walker.autoRun,
      stepMs: walker.stepMs,
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
