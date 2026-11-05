import forum from '../assets/scenes/forum.webp'
import market from '../assets/scenes/market.webp'

export const FIRST_DISTRICT = 'forum'

export const SCENE_ART = { forum, market }

// Districts are the places a visitor can stop. Positions are in scene units,
// where a scene is 1600 x 900.
export const DISTRICTS = {
  forum: {
    id: 'forum',
    name: 'Forum',
    places: [
      { name: 'School', path: '/school', x: 99, y: 312, width: 312, height: 428 },
      { name: 'Message board', path: '/messages', x: 1088, y: 492, width: 194, height: 238 },
    ],
    exits: [
      { to: 'market', label: 'Market row', x: 668, y: 342, width: 264, height: 298 },
    ],
  },
  market: {
    id: 'market',
    name: 'Market row',
    backTo: 'forum',
    places: [
      { name: 'Language stall', path: '/school/languages', x: 604, y: 441, width: 392, height: 279 },
    ],
    exits: [],
  },
}

export const CITY_IMAGES = [forum, market]
