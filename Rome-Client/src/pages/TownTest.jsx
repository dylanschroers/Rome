import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PlacesPanel from '../components/PlacesPanel'
import { createGame } from '../game/createGame'
import { TILE_SIZE, generateTown } from '../game/map'
import { findPlace, townAddress } from '../game/places'
import '../styles/TownTest.css'

const FADE_MS = 170

function readDebugFlag() {
  const requested = new URLSearchParams(window.location.search).has('debug')
  try {
    if (requested) window.sessionStorage.setItem('rome-debug', '1')
    return requested || window.sessionStorage.getItem('rome-debug') === '1'
  } catch {
    return requested
  }
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function TownTest() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const labelsRef = useRef(null)
  const placesButtonRef = useRef(null)
  const gameRef = useRef(null)
  const timerRef = useRef(null)
  const map = useMemo(() => generateTown(), [])
  const startAt = useRef(searchParams.get('at')).current
  const arrivingAtDoor = Boolean(findPlace(map, startAt))
  const [district, setDistrict] = useState('')
  const [showHint, setShowHint] = useState(!arrivingAtDoor)
  const [debugInfo, setDebugInfo] = useState(null)
  const [nearby, setNearby] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [dark, setDark] = useState(arrivingAtDoor)

  const afterFade = useCallback((action) => {
    setDark(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(action, prefersReducedMotion() ? 0 : FADE_MS)
  }, [])

  const enterPlace = useCallback((place) => {
    gameRef.current?.setPaused(true)
    setPanelOpen(false)
    afterFade(() => {
      navigate(townAddress(place.id), { replace: true })
      navigate(place.path, { state: { from: 'town' } })
    })
  }, [afterFade, navigate])

  const enterPlaceRef = useRef(enterPlace)
  enterPlaceRef.current = enterPlace

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    gameRef.current?.setPaused(false)
    placesButtonRef.current?.focus()
  }, [])

  const openPanel = useCallback(() => {
    gameRef.current?.setPaused(true)
    setPanelOpen(true)
  }, [])

  const travelTo = useCallback((place) => {
    setPanelOpen(false)
    afterFade(() => {
      gameRef.current?.travelTo(place.id)
      gameRef.current?.setPaused(false)
      navigate(townAddress(place.id), { replace: true })
      setDark(false)
      placesButtonRef.current?.focus()
    })
  }, [afterFade, navigate])

  useEffect(() => {
    const debug = readDebugFlag()
    const game = createGame({
      canvas: canvasRef.current,
      container: containerRef.current,
      labels: labelsRef.current,
      startAt,
      debug,
      onDistrict: setDistrict,
      onFirstMove: () => setShowHint(false),
      onNearby: setNearby,
      onEnterPlace: (place) => enterPlaceRef.current(place),
      onOpenPlaces: openPanel,
      onDebug: setDebugInfo,
    })

    gameRef.current = game
    if (debug) window.__romeGame = game
    const reveal = setTimeout(() => setDark(false), 30)

    return () => {
      clearTimeout(reveal)
      clearTimeout(timerRef.current)
      game.destroy()
      gameRef.current = null
      delete window.__romeGame
    }
  }, [openPanel, startAt])

  const drawMiniMap = useCallback((target) => gameRef.current?.drawMiniMap(target), [])

  return (
    <main ref={containerRef} className="town-game">
      <canvas ref={canvasRef} className="town-canvas" role="img" aria-label="Top-down view of the town" />

      <div ref={labelsRef} className="town-labels" aria-hidden="true">
        {map.buildings.filter((item) => item.id).map((item) => (
          <span
            key={item.id}
            className={`town-label${item.open ? ' is-open' : ''}`}
            style={{
              '--label-x': (item.x + item.width / 2) * TILE_SIZE,
              '--label-y': (item.y - 2) * TILE_SIZE,
            }}
          >
            {item.name}
          </span>
        ))}
      </div>

      <div className="town-hud">
        <button type="button" className="town-back" aria-label="Back to the gate" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="town-district" aria-live="polite">{district}</h1>
        <button ref={placesButtonRef} type="button" className="town-places" onClick={openPanel}>
          Places
        </button>

        {showHint && !nearby && (
          <p className="town-hint">Arrow keys or WASD to walk, Shift to run, or tap where you want to go</p>
        )}

        {nearby?.open && (
          <button type="button" className="town-prompt" onClick={() => gameRef.current?.enterNearby()}>
            Enter {nearby.name}
            <kbd>E</kbd>
          </button>
        )}
        {nearby && !nearby.open && <p className="town-prompt is-closed">{nearby.name} isn't open yet</p>}
      </div>

      <p className="town-announce" aria-live="polite">
        {nearby && (nearby.open ? `${nearby.name} is here. Press E to enter.` : `${nearby.name} isn't open yet.`)}
      </p>

      {debugInfo && (
        <dl className="town-debug">
          <dt>Frames per second</dt><dd data-debug="fps">{debugInfo.fps ?? '...'}</dd>
          <dt>Slowest frame</dt><dd data-debug="slowest">{debugInfo.slowestFrame ?? '...'} ms</dd>
          <dt>Tile</dt><dd data-debug="tile">{debugInfo.tile ?? '...'}</dd>
          <dt>Scale</dt><dd data-debug="scale">{debugInfo.scale ?? '...'}</dd>
          <dt>View</dt><dd data-debug="view">{debugInfo.view ?? '...'}</dd>
          <dt>Route</dt><dd data-debug="route">{debugInfo.route ?? '...'}</dd>
        </dl>
      )}

      {panelOpen && (
        <PlacesPanel
          map={map}
          drawMiniMap={drawMiniMap}
          onGo={travelTo}
          onEnter={enterPlace}
          onClose={closePanel}
        />
      )}

      <div className={`town-fade${dark ? ' is-dark' : ''}`} aria-hidden="true" />
    </main>
  )
}

