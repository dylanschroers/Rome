import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TILE_SIZE, generateTown } from '../game/map'
import { createGame } from '../game/createGame'
import '../styles/TownTest.css'

// Temporary page for the walking prototype. Phase 4 connects this to the gate.
export default function TownTest() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const labelsRef = useRef(null)
  const [district, setDistrict] = useState('')
  const [showHint, setShowHint] = useState(true)
  const [debugInfo, setDebugInfo] = useState(null)
  const buildings = useMemo(() => generateTown().buildings, [])

  useEffect(() => {
    const debug = new URLSearchParams(window.location.search).has('debug')
    const game = createGame({
      canvas: canvasRef.current,
      container: containerRef.current,
      labels: labelsRef.current,
      debug,
      onDistrict: setDistrict,
      onFirstMove: () => setShowHint(false),
      onDebug: setDebugInfo,
    })

    if (debug) window.__romeGame = game

    return () => {
      game.destroy()
      delete window.__romeGame
    }
  }, [])

  return (
    <main ref={containerRef} className="town-game">
      <canvas ref={canvasRef} className="town-canvas" aria-label="Top-down view of the town" />

      <div ref={labelsRef} className="town-labels" aria-hidden="true">
        {buildings.filter((item) => item.name !== 'Empty plot').map((item) => (
          <span
            key={item.name}
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
        {showHint && <p className="town-hint">Use arrow keys or WASD, or tap where you want to go</p>}
      </div>

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
    </main>
  )
}
