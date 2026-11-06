import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { TILE_SIZE } from '../../world/map'
import { createGame } from './createGame'

const TopdownMode = forwardRef(function TopdownMode({ map, startAt, active, debug, events }, ref) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const labelsRef = useRef(null)
  const gameRef = useRef(null)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const activeRef = useRef(active)
  activeRef.current = active

  useImperativeHandle(ref, () => ({
    travelTo: (id) => gameRef.current?.travelTo(id),
    enterNearby: () => gameRef.current?.enterNearby(),
    leaveByGate: () => gameRef.current?.leaveByGate(),
    walkIn: (options) => gameRef.current?.walkIn(options),
    setPaused: (value) => gameRef.current?.setPaused(value),
    drawMiniMap: (target) => gameRef.current?.drawMiniMap(target),
  }), [])

  useEffect(() => {
    const call = (name) => (...args) => eventsRef.current[name]?.(...args)
    const game = createGame({
      canvas: canvasRef.current,
      container: containerRef.current,
      labels: labelsRef.current,
      map,
      startAt,
      debug,
      active: activeRef.current,
      onDistrict: call('onDistrict'),
      onFirstMove: call('onFirstMove'),
      onNearby: call('onNearby'),
      onAtGate: call('onAtGate'),
      onEnterPlace: call('onEnterPlace'),
      onOpenPlaces: call('onOpenPlaces'),
      onLeaveTown: call('onLeaveTown'),
      onDebug: call('onDebug'),
    })
    gameRef.current = game
    if (debug) window.__romeGame = game

    return () => {
      game.destroy()
      gameRef.current = null
      if (window.__romeGame === game) delete window.__romeGame
    }
  }, [map, startAt, debug])

  useEffect(() => {
    gameRef.current?.setActive(active)
  }, [active])

  return (
    <div ref={containerRef} className="town-mode">
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
    </div>
  )
})

export default TopdownMode
