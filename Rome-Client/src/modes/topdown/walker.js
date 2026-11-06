import { canStep } from '../../world/map.js'

export const WALK_TILES_PER_SECOND = 6
export const RUN_SPEED_MULTIPLIER = 2

const STEP_MS = 1000 / WALK_TILES_PER_SECOND

const OFFSETS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  'up-left': { x: -1, y: -1 },
  'up-right': { x: 1, y: -1 },
  'down-left': { x: -1, y: 1 },
  'down-right': { x: 1, y: 1 },
}

// A diagonal covers more ground, so it takes longer and the speed stays the same.
const stepDuration = (dx, dy) => (dx !== 0 && dy !== 0 ? STEP_MS * Math.SQRT2 : STEP_MS)

export function createWalker(x, y, facing = 'down') {
  return {
    x,
    y,
    toX: x,
    toY: y,
    facing,
    moving: false,
    progress: 0,
    stepMs: STEP_MS,
    steps: 0,
    route: [],
    autoRun: false,
  }
}

function directionBetween(fromX, fromY, toX, toY) {
  const dx = toX - fromX
  const dy = toY - fromY
  if (dx === 0 && dy === 0) return null
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return null
  return Object.keys(OFFSETS).find((name) => OFFSETS[name].x === dx && OFFSETS[name].y === dy)
}

// A character only faces four ways. On a diagonal it keeps facing a direction that
// is part of that diagonal, and otherwise faces sideways.
function facingFor(direction, current) {
  const parts = direction.split('-')
  if (parts.includes(current)) return current
  return parts[parts.length - 1]
}

// The step to take for a direction. A blocked diagonal slides along whichever
// side is open, so walking into a wall at an angle keeps you moving.
function chooseStep(map, x, y, direction) {
  const offset = OFFSETS[direction]
  if (canStep(map, x, y, offset.x, offset.y)) return offset
  if (offset.x === 0 || offset.y === 0) return null
  if (canStep(map, x, y, offset.x, 0)) return { x: offset.x, y: 0 }
  if (canStep(map, x, y, 0, offset.y)) return { x: 0, y: offset.y }
  return null
}

// Where a new route should begin: the tile being walked to, or the current one.
export function routeStart(walker) {
  return walker.moving ? { x: walker.toX, y: walker.toY } : { x: walker.x, y: walker.y }
}

// How long a route takes to walk, in seconds.
export function routeSeconds(from, route) {
  let at = from
  let total = 0
  for (const tile of route) {
    total += stepDuration(tile.x - at.x, tile.y - at.y)
    at = tile
  }
  return total / 1000
}

// Moves the walker forward by `elapsed` milliseconds. `held` is the direction being
// held, or null. A held direction takes over from any route.
export function stepWalker(walker, map, held, elapsed, running = false) {
  let remaining = elapsed

  if (held) {
    walker.route = []
    walker.autoRun = false
  }

  while (remaining > 0) {
    if (walker.moving) {
      const needed = (1 - walker.progress) * walker.stepMs
      if (remaining < needed) {
        walker.progress += remaining / walker.stepMs
        return
      }

      remaining -= needed
      walker.x = walker.toX
      walker.y = walker.toY
      walker.moving = false
      walker.progress = 0
      walker.steps += 1
      continue
    }

    const routeTile = walker.route[0]
    const direction = held || (routeTile
      ? directionBetween(walker.x, walker.y, routeTile.x, routeTile.y)
      : null)

    if (!direction) {
      walker.route = []
      walker.autoRun = false
      return
    }

    walker.facing = facingFor(direction, walker.facing)

    const step = chooseStep(map, walker.x, walker.y, direction)

    if (!step) {
      walker.route = []
      walker.autoRun = false
      return
    }

    if (routeTile && !held) walker.route.shift()
    walker.toX = walker.x + step.x
    walker.toY = walker.y + step.y
    walker.stepMs = stepDuration(step.x, step.y) / (running || walker.autoRun ? RUN_SPEED_MULTIPLIER : 1)
    walker.moving = true
    walker.progress = 0

    // A slide along a wall faces the way the walker actually moves.
    if (step.x === 0 || step.y === 0) {
      walker.facing = directionBetween(0, 0, step.x, step.y)
    }
  }
}

export function placeWalker(walker, x, y, facing) {
  walker.x = x
  walker.y = y
  walker.toX = x
  walker.toY = y
  walker.facing = facing
  walker.moving = false
  walker.progress = 0
  walker.route = []
  walker.autoRun = false
}

// The walker's exact position in tiles, including how far through a step it is.
export function walkerPosition(walker) {
  if (!walker.moving) return { x: walker.x, y: walker.y }
  return {
    x: walker.x + (walker.toX - walker.x) * walker.progress,
    y: walker.y + (walker.toY - walker.y) * walker.progress,
  }
}
