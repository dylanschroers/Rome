import { createKeyStack, directionForKey } from './keys.js'
import { districtNameAt, gateExitRow, generateTown, isAtGateExit, isGateTile, isLeavingByGate } from '../../world/map.js'
import { doorStart, findPlace, placeNear, placeUnderTile } from '../../world/places.js'
import { buildGroundCanvas, buildSolidCanvas, drawFrame, drawMiniMap } from './render.js'
import { findRoute } from '../../world/route.js'
import { computeCamera, computeLayout, screenToTile } from './view.js'
import { createWalker, placeWalker, routeStart, stepWalker, walkerPosition } from './walker.js'

const TICK_MS = 1000 / 60
const LONGEST_FRAME_MS = 100
const TAP_DISTANCE_PX = 12
const AUTO_RUN_TILES = 12
const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const ENTER_KEYS = new Set(['KeyE', 'Enter', 'Space'])
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight'])

export function createGame({
  canvas,
  container,
  labels,
  map = generateTown(),
  startAt,
  active: startActive = true,
  onDistrict,
  onFirstMove,
  onNearby,
  onAtGate,
  onEnterPlace,
  onOpenPlaces,
  onLeaveTown,
  onDebug,
  debug: startDebug,
}) {
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
  let pendingLeave = false
  let atGate = false
  let leaving = false
  let active = startActive
  let scripted = false

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

    if (held) {
      pendingPlace = null
      pendingLeave = false
      scripted = false
    }

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

    if (scripted && !walker.moving && walker.route.length === 0) scripted = false

    if (!moved && walker.moving && !scripted) {
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

    const gateNow = !scripted && isAtGateExit(map, walker.x, walker.y)
    if (gateNow !== atGate) {
      atGate = gateNow
      onAtGate(gateNow)
    }

    if (walker.moving || walker.route.length > 0) return

    if (pendingPlace) {
      const place = pendingPlace
      pendingPlace = null
      if (near === place) onEnterPlace(place)
    }

    if (isLeavingByGate(map, walker.x, walker.y, held) || (pendingLeave && gateNow)) leaveByGate()
    pendingLeave = false
  }

  function leaveByGate() {
    if (leaving || !active) return
    leaving = true
    pendingPlace = null
    pendingLeave = false
    releaseEverything()
    onLeaveTown()
  }

  function redraw() {
    if (!layout) return
    update(0)
    render()
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
    if (frame !== null || !active || document.hidden) return
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

    if (paused || !active) return

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
      if (event.repeat) return
      if (nearby?.open) {
        event.preventDefault()
        onEnterPlace(nearby)
      } else if (atGate && !nearby) {
        event.preventDefault()
        leaveByGate()
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

  function releaseEverything() {
    keys.clear()
    running = false
  }

  const onVisibility = () => {
    releaseEverything()
    if (document.hidden) stop()
    else start()
  }

  const onPointerDown = (event) => {
    if (event.button !== 0 || paused || !active) return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event) => {
    if (!pointer || event.pointerId !== pointer.id || !layout) return
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
    pointer = null
    if (distance > TAP_DISTANCE_PX) return

    const box = canvas.getBoundingClientRect()
    const target = screenToTile(event.clientX - box.left, event.clientY - box.top, layout, camera)
    const toGate = isGateTile(map, target.x, target.y)
    const place = toGate ? null : placeUnderTile(map, target.x, target.y)
    const goal = toGate ? { x: target.x, y: gateExitRow(map) } : place ? place.door : target
    const route = findRoute(map, routeStart(walker), goal)
    walker.route = route
    walker.autoRun = route.length > AUTO_RUN_TILES
    keys.clear()
    pendingPlace = place?.open ? place : null
    pendingLeave = toGate
    scripted = false
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

  redraw()
  start()

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
      redraw()
    },
    walkIn({ instant = false } = {}) {
      const row = gateExitRow(map)
      if (instant) {
        placeWalker(walker, map.spawn.x, map.spawn.y, map.spawn.facing)
      } else {
        placeWalker(walker, map.spawn.x, row, 'up')
        walker.route = [{ x: map.spawn.x, y: row - 1 }, { x: map.spawn.x, y: row - 2 }]
        scripted = true
      }
      marker = null
      pendingPlace = null
      pendingLeave = false
      leaving = false
      releaseEverything()
      redraw()
    },
    leaveByGate,
    setActive(value) {
      active = value
      leaving = false
      leftover = 0
      releaseEverything()
      if (active) {
        dirty = true
        start()
      } else {
        stop()
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
      active,
      atGate,
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
