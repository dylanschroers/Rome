// The city is a line of flat scenes standing one behind another. Each scene is
// drawn in a 1600 x 900 space, and the visitor walks through openings cut into
// them. This file has no images, so the art export script can use it too.
export const SCENE_WIDTH = 1600
export const SCENE_HEIGHT = 900

// Each opening is measured in its own scene. `travel` is how far the visitor walks
// to the next scene, in perspective distances. It has to bring the opening past the
// edges of any screen while the next scene is just reaching full size, because going
// further would show that scene's edges around it.
const OPENINGS = {
  forum: { x: 800, y: 540, travel: 0.913 },
}

const ORDER = ['forum', 'market']

// The color of each scene's bottom edge. A strip of it continues the ground below
// the image, because that edge rises into view during the walk.
const GROUND_COLORS = { forum: '#2a2426', market: '#2d2625' }

// A scene you walk into is drawn slightly oversized, so its edges stay off screen
// during the moment the opening ahead of it widens past the sides.
const OVERSIZE = { forum: 1, market: 1.04 }

function buildPlanes() {
  const planes = []
  let x = 0
  let y = 0
  let depth = 0

  ORDER.forEach((id) => {
    planes.push({ id, x, y, depth, ground: GROUND_COLORS[id], size: OVERSIZE[id] })

    const opening = OPENINGS[id]
    if (!opening) return

    x += (opening.x - SCENE_WIDTH / 2) * opening.travel
    y += (opening.y - SCENE_HEIGHT / 2) * opening.travel
    depth += opening.travel
  })

  return planes
}

// `x` and `y` are in scene units. `depth` is measured in perspective distances.
export const PLANES = buildPlanes()

export const planeById = (id) => PLANES.find((plane) => plane.id === id)
