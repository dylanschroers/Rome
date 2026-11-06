import { canStep } from './map.js'

const STRAIGHT_COST = 10
const DIAGONAL_COST = 14

const NEIGHBORS = [
  [0, -1, STRAIGHT_COST],
  [1, 0, STRAIGHT_COST],
  [0, 1, STRAIGHT_COST],
  [-1, 0, STRAIGHT_COST],
  [1, -1, DIAGONAL_COST],
  [1, 1, DIAGONAL_COST],
  [-1, 1, DIAGONAL_COST],
  [-1, -1, DIAGONAL_COST],
]

// A small priority queue, since diagonal steps cost more than straight ones.
function createQueue() {
  const items = []

  return {
    get size() {
      return items.length
    },
    push(tile, cost) {
      items.push({ tile, cost })
      let at = items.length - 1
      while (at > 0) {
        const parent = (at - 1) >> 1
        if (items[parent].cost <= items[at].cost) break
        ;[items[parent], items[at]] = [items[at], items[parent]]
        at = parent
      }
    },
    pop() {
      const top = items[0]
      const last = items.pop()
      if (items.length) {
        items[0] = last
        let at = 0
        for (;;) {
          const left = at * 2 + 1
          const right = left + 1
          let smallest = at
          if (left < items.length && items[left].cost < items[smallest].cost) smallest = left
          if (right < items.length && items[right].cost < items[smallest].cost) smallest = right
          if (smallest === at) break
          ;[items[smallest], items[at]] = [items[at], items[smallest]]
          at = smallest
        }
      }
      return top
    },
  }
}

// Finds the quickest walk from one tile to another, using diagonals where it can.
// If the target can't be reached, the route ends at the reachable tile closest to
// it. The result lists each tile to step onto, and is empty if there's nowhere to go.
export function findRoute(map, from, target) {
  const size = map.width * map.height
  const previous = new Int32Array(size).fill(-1)
  const costs = new Int32Array(size).fill(-1)
  const queue = createQueue()
  const start = from.y * map.width + from.x
  let best = start
  let bestGap = Math.hypot(from.x - target.x, from.y - target.y)

  costs[start] = 0
  queue.push(start, 0)

  while (queue.size) {
    const { tile: current, cost } = queue.pop()
    if (cost > costs[current]) continue

    const x = current % map.width
    const y = Math.floor(current / map.width)
    const gap = Math.hypot(x - target.x, y - target.y)

    if (gap < bestGap) {
      best = current
      bestGap = gap
    }
    if (gap === 0) break

    for (const [dx, dy, stepCost] of NEIGHBORS) {
      if (!canStep(map, x, y, dx, dy)) continue
      const next = (y + dy) * map.width + x + dx
      const nextCost = cost + stepCost
      if (costs[next] !== -1 && costs[next] <= nextCost) continue
      costs[next] = nextCost
      previous[next] = current
      queue.push(next, nextCost)
    }
  }

  const route = []
  for (let at = best; at !== start; at = previous[at]) {
    route.push({ x: at % map.width, y: Math.floor(at / map.width) })
  }
  return route.reverse()
}
