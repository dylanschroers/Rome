import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PlacesPanel from '../components/PlacesPanel'
import { readSavedMode } from '../modes/modeChoice'
import { MODES } from '../modes/registry'
import { generateTown } from '../world/map'
import { findPlace, townAddress } from '../world/places'
import '../styles/Town.css'

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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const TownShell = forwardRef(function TownShell({ active, onLeave }, ref) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rootRef = useRef(null)
  const modeRef = useRef(null)
  const placesButtonRef = useRef(null)
  const timerRef = useRef(null)
  const map = useMemo(() => generateTown(), [])
  const [debug] = useState(readDebugFlag)
  const [modeId] = useState(readSavedMode)
  const Mode = MODES[modeId].Component
  const startAt = useRef(searchParams.get('at')).current
  const [district, setDistrict] = useState('')
  const [showHint, setShowHint] = useState(!findPlace(map, startAt))
  const [debugInfo, setDebugInfo] = useState(null)
  const [nearby, setNearby] = useState(null)
  const [atGate, setAtGate] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [dark, setDark] = useState(true)
  const [arriving, setArriving] = useState(false)

  const afterFade = useCallback((action) => {
    setDark(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(action, prefersReducedMotion() ? 0 : FADE_MS)
  }, [])

  const enterPlace = useCallback((place) => {
    modeRef.current?.setPaused(true)
    setPanelOpen(false)
    afterFade(() => {
      navigate(townAddress(place.id), { replace: true })
      navigate(place.path, { state: { from: 'town' } })
    })
  }, [afterFade, navigate])

  const openPanel = useCallback(() => {
    modeRef.current?.setPaused(true)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    modeRef.current?.setPaused(false)
    placesButtonRef.current?.focus()
  }, [])

  const travelTo = useCallback((place) => {
    setPanelOpen(false)
    afterFade(() => {
      modeRef.current?.travelTo(place.id)
      modeRef.current?.setPaused(false)
      navigate(townAddress(place.id), { replace: true })
      setDark(false)
      placesButtonRef.current?.focus()
    })
  }, [afterFade, navigate])

  const leave = useCallback(() => {
    modeRef.current?.setPaused(true)
    setPanelOpen(false)
    onLeave()
  }, [onLeave])

  const events = {
    onDistrict: setDistrict,
    onFirstMove: () => setShowHint(false),
    onNearby: setNearby,
    onAtGate: setAtGate,
    onEnterPlace: enterPlace,
    onOpenPlaces: openPanel,
    onLeaveTown: leave,
    onDebug: setDebugInfo,
  }

  useImperativeHandle(ref, () => ({
    async fadeOut() {
      clearTimeout(timerRef.current)
      modeRef.current?.setPaused(true)
      setPanelOpen(false)
      setArriving(false)
      setDark(true)
      if (!prefersReducedMotion()) await wait(FADE_MS)
    },
    fadeIn() {
      modeRef.current?.setPaused(false)
      setDark(false)
    },
    walkIn() {
      setArriving(true)
      setShowHint(true)
      modeRef.current?.walkIn({ instant: prefersReducedMotion() })
    },
    focus() {
      rootRef.current?.focus({ preventScroll: true })
    },
  }), [])

  useEffect(() => {
    rootRef.current.inert = !active
    if (!active) {
      clearTimeout(timerRef.current)
      setPanelOpen(false)
      setDark(true)
      return undefined
    }

    modeRef.current?.setPaused(false)
    const reveal = setTimeout(() => setDark(false), 30)
    return () => clearTimeout(reveal)
  }, [active])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const drawMiniMap = useCallback((target) => modeRef.current?.drawMiniMap(target), [])
  const gatePrompt = atGate && !nearby

  return (
    <main
      ref={rootRef}
      className={`town-game${active ? ' is-active' : ''}`}
      tabIndex={-1}
      aria-label="Rome"
    >
      <Mode ref={modeRef} map={map} startAt={startAt} active={active} debug={debug} events={events} />

      <div className="town-hud">
        <button type="button" className="town-back" aria-label="Back to the gate" onClick={leave}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="town-district" aria-live="polite">{district}</h1>
        <button ref={placesButtonRef} type="button" className="town-places" onClick={openPanel}>
          Places
        </button>

        {showHint && !nearby && !gatePrompt && (
          <p className="town-hint">Arrow keys or WASD to walk, Shift to run, or tap where you want to go</p>
        )}

        {nearby?.open && (
          <button type="button" className="town-prompt" onClick={() => modeRef.current?.enterNearby()}>
            Enter {nearby.name}
            <kbd>E</kbd>
          </button>
        )}
        {nearby && !nearby.open && <p className="town-prompt is-closed">{nearby.name} isn't open yet</p>}
        {gatePrompt && (
          <button type="button" className="town-prompt" onClick={() => modeRef.current?.leaveByGate()}>
            Leave town
            <kbd>E</kbd>
          </button>
        )}
      </div>

      <p className="town-announce" aria-live="polite">
        {nearby && (nearby.open ? `${nearby.name} is here. Press E to enter.` : `${nearby.name} isn't open yet.`)}
        {gatePrompt && 'The gate is here. Press E to leave town.'}
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

      <div className={`town-fade${dark ? ' is-dark' : ''}${arriving ? ' is-arriving' : ''}`} aria-hidden="true" />
    </main>
  )
})

export default TownShell
