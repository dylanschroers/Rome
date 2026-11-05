export const TOWN_PATH = '/town-test'

const REACH_TILES = 1
const ROOF_TILES = 2
const FACING_FROM_DOOR = { bottom: 'down', top: 'up', left: 'left', right: 'right' }

export const townAddress = (id) => `${TOWN_PATH}?at=${id}`

export const listPlaces = (map) => map.buildings.filter((building) => building.id)

export const findPlace = (map, id) => listPlaces(map).find((place) => place.id === id) || null

export function doorStart(place) {
  return { x: place.door.x, y: place.door.y, facing: FACING_FROM_DOOR[place.door.side] }
}

export function placeNear(map, x, y) {
  let nearest = null
  let nearestGap = Infinity

  for (const place of listPlaces(map)) {
    const gap = Math.max(Math.abs(place.door.x - x), Math.abs(place.door.y - y))
    if (gap <= REACH_TILES && gap < nearestGap) {
      nearest = place
      nearestGap = gap
    }
  }

  return nearest
}

export function placeUnderTile(map, x, y) {
  return listPlaces(map).find((place) => (
    x >= place.x
    && x < place.x + place.width
    && y >= place.y - ROOF_TILES
    && y < place.y + place.height
  )) || null
}
