import MapMode from './map/MapMode'
import TopdownMode from './topdown/TopdownMode'

export const MODES = {
  map: {
    id: 'map',
    name: 'Map',
    Component: MapMode,
    hint: 'Tap a building to go inside',
    placesPanel: false,
  },
  topdown: {
    id: 'topdown',
    name: 'Walk',
    Component: TopdownMode,
    hint: 'Arrow keys or WASD to walk, Shift to run, or tap where you want to go',
    placesPanel: true,
  },
}
