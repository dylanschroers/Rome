const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
}

const VERTICAL = new Set(['up', 'down'])

export const directionForKey = (code) => KEY_DIRECTIONS[code] || null

// Tracks which direction keys are down. One up or down key plus one left or right
// key makes a diagonal. If opposite keys are held, the newest one wins, and letting
// go of it falls back to whichever is still held.
export function createKeyStack() {
  let held = []
  let tapped = null

  const newestOnAxis = (isAxis) => {
    for (let index = held.length - 1; index >= 0; index -= 1) {
      const direction = KEY_DIRECTIONS[held[index]]
      if (isAxis(direction)) return direction
    }
    return null
  }

  return {
    press(code) {
      if (!KEY_DIRECTIONS[code] || held.includes(code)) return
      held.push(code)
      tapped = KEY_DIRECTIONS[code]
    },
    release(code) {
      held = held.filter((item) => item !== code)
    },
    clear() {
      held = []
      tapped = null
    },
    current() {
      const vertical = newestOnAxis((direction) => VERTICAL.has(direction))
      const horizontal = newestOnAxis((direction) => !VERTICAL.has(direction))
      if (vertical && horizontal) return `${vertical}-${horizontal}`
      return vertical || horizontal || tapped
    },
    // A key pressed and released between frames still counts until the game has used it.
    used() {
      tapped = null
    },
  }
}
