import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { findPlace, listPlaces } from '../../world/places'
import { drawMapArt, mapBounds } from './drawMapArt'
import '../../styles/MapMode.css'

const MIN_TILE_PX = 6
const MAX_ART_TILE_PX = 16
const MAX_PANNING_TILE_PX = 10
const SPACE_ABOVE = 76
const SPACE_BELOW = 84
const SPACE_SIDES = 16
const LABEL_GAP = 0.9
const ACTIVATE_KEYS = new Set(['Enter', ' '])
const TEXT_ENTRY = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function doorNotch(place) {
  const { door, x, y, width, height } = place
  if (door.side === 'bottom') return { x: door.x + 0.2, y: y + height - 0.9, width: 0.6, height: 0.9 }
  if (door.side === 'top') return { x: door.x + 0.2, y, width: 0.6, height: 0.9 }
  if (door.side === 'left') return { x, y: door.y + 0.2, width: 0.9, height: 0.6 }
  return { x: x + width - 0.9, y: door.y + 0.2, width: 0.9, height: 0.6 }
}

function HouseShape({ place }) {
  const { x, y, width, height } = place
  const notch = doorNotch(place)
  return (
    <>
      <rect className="map-shape map-roof" x={x} y={y} width={width} height={height} rx="0.3" />
      <path className="map-ridge" d={`M${x + 0.7} ${y + height / 2}H${x + width - 0.7}`} />
      <rect className="map-door" {...notch} />
    </>
  )
}

function CastleShape({ place }) {
  const { x, y, width, height } = place
  const merlons = []
  for (let left = x + 0.4; left + 0.8 <= x + width; left += 1.6) merlons.push(left)
  return (
    <>
      <rect className="map-shape map-castle" x={x} y={y} width={width} height={height} />
      <rect className="map-castle-keep" x={x + width / 2 - 3} y={y + 2} width="6" height={height - 4} />
      {merlons.map((left) => <rect key={left} className="map-castle-merlon" x={left} y={y - 0.6} width="0.8" height="0.8" />)}
      {[[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} className="map-castle-tower" cx={cx} cy={cy} r="1.4" />
      ))}
      <rect className="map-door" {...doorNotch(place)} />
    </>
  )
}

function GardenShape({ place }) {
  const { x, y, width, height } = place
  const hedges = []
  for (let row = y + 1.5; row < y + height - 1; row += 2.5) {
    for (let column = x + 1.5; column < x + width - 1; column += 2.5) hedges.push([column, row])
  }
  return (
    <>
      <rect className="map-shape map-garden" x={x} y={y} width={width} height={height} rx="1" />
      {hedges.map(([cx, cy]) => <circle key={`${cx},${cy}`} className="map-hedge" cx={cx} cy={cy} r="0.8" />)}
      <path className="map-garden-path" d={`M${x + width / 2} ${y + 0.6}V${y + height - 0.6}M${x + 0.6} ${y + height / 2}H${x + width}`} />
    </>
  )
}

function ColosseumShape({ place }) {
  const cx = place.x + place.width / 2
  const cy = place.y + place.height / 2
  return (
    <>
      <ellipse className="map-shape map-colosseum" cx={cx} cy={cy} rx={place.width / 2} ry={place.height / 2 - 0.5} />
      <ellipse className="map-colosseum-ring" cx={cx} cy={cy} rx={place.width / 2 - 1.6} ry={place.height / 2 - 2.1} />
      <ellipse className="map-arena" cx={cx} cy={cy} rx={place.width / 2 - 4} ry={place.height / 2 - 4.6} />
    </>
  )
}

const SHAPES = { house: HouseShape, castle: CastleShape, garden: GardenShape, colosseum: ColosseumShape }

function MapPlace({ place, selected, onChoose }) {
  const Shape = SHAPES[place.style]
  const onKeyDown = (event) => {
    if (!ACTIVATE_KEYS.has(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    onChoose(place)
  }

  return (
    <g
      className={`map-place${place.open ? ' is-open' : ''}${selected ? ' is-selected' : ''}`}
      data-place={place.id}
      role="button"
      tabIndex={0}
      aria-label={place.open ? `${place.name}, go inside` : `${place.name}, not open yet`}
      onClick={() => onChoose(place)}
      onKeyDown={onKeyDown}
    >
      <Shape place={place} />
      <text className="map-label" x={place.x + place.width / 2} y={place.y - LABEL_GAP}>{place.name}</text>
    </g>
  )
}

const MapMode = forwardRef(function MapMode({ map, startAt, active, debug, events }, ref) {
  const scrollRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const artTilePx = useRef(0)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const activeRef = useRef(active)
  activeRef.current = active
  const [tilePx, setTilePx] = useState(0)
  const [selectedId, setSelectedId] = useState(() => findPlace(map, startAt)?.id ?? null)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const pendingScroll = useRef(selectedId ? { place: selectedId } : { tile: map.districts[0] })
  const bounds = useMemo(() => mapBounds(map), [map])
  const places = listPlaces(map)
  const plots = map.buildings.filter((item) => !item.id)

  const select = useCallback((id) => {
    setSelectedId(id)
    selectedRef.current = id
    eventsRef.current.onNearby?.(findPlace(map, id))
  }, [map])

  const choose = useCallback((place) => {
    if (!activeRef.current) return
    eventsRef.current.onFirstMove?.()
    select(place.id)
    if (place.open) eventsRef.current.onEnterPlace?.(place)
  }, [select])

  const leave = useCallback(() => {
    if (!activeRef.current) return
    select(null)
    eventsRef.current.onLeaveTown?.()
  }, [select])

  const scrollToTile = useCallback((x, y) => {
    const scroller = scrollRef.current
    const stage = stageRef.current
    if (!scroller || !stage || !tilePx) return
    scroller.scrollTo({
      left: stage.offsetLeft + (x - bounds.x) * tilePx - scroller.clientWidth / 2,
      top: stage.offsetTop + (y - bounds.y) * tilePx - scroller.clientHeight / 2,
    })
  }, [bounds, tilePx])

  const scrollToPlace = useCallback((id) => {
    const place = findPlace(map, id)
    if (place) scrollToTile(place.x + place.width / 2, place.y + place.height / 2)
  }, [map, scrollToTile])

  useImperativeHandle(ref, () => ({
    travelTo(id) {
      if (!findPlace(map, id)) return
      select(id)
      scrollToPlace(id)
    },
    enterNearby() {
      const place = findPlace(map, selectedRef.current)
      if (place?.open) eventsRef.current.onEnterPlace?.(place)
    },
    leaveByGate: leave,
    walkIn() {
      select(null)
      scrollToTile(map.districts[0].x, map.districts[0].y)
    },
    setPaused() {},
    drawMiniMap() {},
  }), [leave, map, scrollToPlace, scrollToTile, select])

  useEffect(() => {
    const scroller = scrollRef.current
    const measure = () => {
      const width = scroller.clientWidth - SPACE_SIDES * 2
      const height = scroller.clientHeight - SPACE_ABOVE - SPACE_BELOW
      if (width <= 0 || height <= 0) return
      const fit = Math.min(width / bounds.width, height / bounds.height)
      const fillHeight = Math.min(MAX_PANNING_TILE_PX, height / bounds.height)
      const next = Math.floor(Math.max(MIN_TILE_PX, fit < MIN_TILE_PX ? fillHeight : fit) * 4) / 4
      setTilePx(next)

      const wanted = Math.min(MAX_ART_TILE_PX, Math.ceil(next * Math.min(window.devicePixelRatio || 1, 2)))
      if (wanted > artTilePx.current) {
        artTilePx.current = wanted
        drawMapArt(canvasRef.current, map, bounds, wanted)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    measure()
    return () => observer.disconnect()
  }, [bounds, map])

  useEffect(() => {
    if (!tilePx || !pendingScroll.current) return
    const target = pendingScroll.current
    pendingScroll.current = null
    if (target.place) scrollToPlace(target.place)
    else scrollToTile(target.tile.x, target.tile.y)
  }, [scrollToPlace, scrollToTile, tilePx])

  useEffect(() => {
    eventsRef.current.onDistrict?.('Rome')
    if (selectedRef.current) eventsRef.current.onNearby?.(findPlace(map, selectedRef.current))
  }, [map])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!activeRef.current || TEXT_ENTRY.has(event.target?.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (event.code === 'Escape' && selectedRef.current) {
        select(null)
        return
      }
      if (event.code !== 'KeyE') return
      const place = findPlace(map, selectedRef.current)
      if (place?.open) {
        event.preventDefault()
        eventsRef.current.onEnterPlace?.(place)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [map, select])

  useEffect(() => {
    if (!debug) return undefined
    const hook = {
      map,
      travelTo: (id) => {
        select(id)
        scrollToPlace(id)
      },
      inspect: () => ({
        mode: 'map',
        running: activeRef.current,
        selected: selectedRef.current,
        tilePx,
        artTilePx: artTilePx.current,
      }),
    }
    window.__romeGame = hook
    return () => {
      if (window.__romeGame === hook) delete window.__romeGame
    }
  }, [debug, map, scrollToPlace, select, tilePx])

  const { gate } = map

  return (
    <div ref={scrollRef} className="map-mode">
      <div className="map-sheet" style={{ padding: `${SPACE_ABOVE}px ${SPACE_SIDES}px ${SPACE_BELOW}px` }}>
        <div
          ref={stageRef}
          className="map-stage"
          style={{ width: bounds.width * tilePx, height: bounds.height * tilePx }}
        >
          <canvas ref={canvasRef} className="map-art" aria-hidden="true" />
          <svg className="map-places" viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} role="group" aria-label="Map of the town">
            {plots.map((plot) => (
              <rect key={`${plot.x},${plot.y}`} className="map-plot" x={plot.x} y={plot.y} width={plot.width} height={plot.height} rx="0.3" />
            ))}
            {places.map((place) => (
              <MapPlace key={place.id} place={place} selected={place.id === selectedId} onChoose={choose} />
            ))}
            <g
              className="map-place map-gate is-open"
              data-place="gate"
              role="button"
              tabIndex={0}
              aria-label="Gate, leave town"
              onClick={leave}
              onKeyDown={(event) => {
                if (!ACTIVATE_KEYS.has(event.key)) return
                event.preventDefault()
                event.stopPropagation()
                leave()
              }}
            >
              <rect className="map-shape map-gate-arch" x={gate.x} y={gate.y - 0.2} width={gate.width} height={map.height - gate.y + 0.2} />
              <text className="map-label map-gate-label" x={gate.x + gate.width / 2} y={gate.y + 2.6}>Gate</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
})

export default MapMode
