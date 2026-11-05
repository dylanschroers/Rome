import { Fragment, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DISTRICTS, FIRST_DISTRICT, SCENE_ART } from '../city/districts'
import { PLANES, SCENE_HEIGHT, SCENE_WIDTH, planeById } from '../city/geometry'
import '../styles/Scenes.css'

const WALK_MS = 1800
const REPEAT_TRIP_SPEED = 0.8
const VEIL_MS = 200
const STALL_MARGIN_MS = 500
const DRAG_THRESHOLD_PX = 6

let tripsTaken = 0

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function readMetrics() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cityHeight = Math.max(vh, vw * 0.5625)
  const cityWidth = cityHeight * (SCENE_WIDTH / SCENE_HEIGHT)
  return {
    vw,
    scale: cityHeight / SCENE_HEIGHT,
    perspective: cityWidth,
    maxPan: Math.max(0, (cityWidth - vw) / 2),
  }
}

function percent(value, total) {
  return `${(value / total) * 100}%`
}

function placeStyle(item) {
  return {
    left: percent(item.x, SCENE_WIDTH),
    top: percent(item.y, SCENE_HEIGHT),
    width: percent(item.width, SCENE_WIDTH),
    height: percent(item.height, SCENE_HEIGHT),
  }
}

const Scenes = forwardRef(function Scenes({ active, district, tier, leaving, focusOnArrival, onLeaveCity }, ref) {
  const navigate = useNavigate()
  const [stop, setStop] = useState(district)
  const [traveling, setTraveling] = useState(false)
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const worldRef = useRef(null)
  const panRef = useRef(null)
  const veilRef = useRef(null)
  const headingRef = useRef(null)
  const planeRefs = useRef({})
  const groundRefs = useRef({})
  const metrics = useRef(null)
  const pan = useRef(0)
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const activeAnimation = useRef(null)
  const trip = useRef(null)
  const wanted = useRef(district)
  const stopRef = useRef(district)
  const tierRef = useRef(tier)
  tierRef.current = tier
  stopRef.current = stop
  metrics.current ||= readMetrics()

  const cameraTransform = useCallback((planeId) => {
    const plane = planeById(planeId)
    const { scale, perspective } = metrics.current
    return `translate3d(${-plane.x * scale}px, ${-plane.y * scale}px, ${plane.depth * perspective}px)`
  }, [])

  const layoutWorld = useCallback(() => {
    const { scale, perspective } = metrics.current
    stageRef.current.style.perspective = `${perspective}px`

    PLANES.forEach((plane) => {
      planeRefs.current[plane.id].style.transform =
        `translate3d(${plane.x * scale}px, ${plane.y * scale}px, ${-plane.depth * perspective}px) scale(${plane.size})`
      groundRefs.current[plane.id].style.transform =
        `translate3d(${plane.x * scale}px, ${(plane.y + SCENE_HEIGHT * plane.size - 1) * scale}px, ${-plane.depth * perspective}px) scale(${plane.size})`
    })
  }, [])

  const placeCamera = useCallback((planeId) => {
    worldRef.current.style.transform = cameraTransform(planeId)
  }, [cameraTransform])

  const writePan = useCallback((value, animated) => {
    const limit = metrics.current.maxPan
    pan.current = Math.max(-limit, Math.min(limit, value))
    panRef.current.classList.toggle('is-gliding', Boolean(animated))
    panRef.current.style.transform = `translate3d(${pan.current}px, 0, 0)`

    const root = rootRef.current
    if (!root) return
    const pannable = limit > 1
    const edge = !pannable ? 'none' : pan.current >= limit - 1 ? 'start' : pan.current <= -limit + 1 ? 'end' : 'middle'
    if (root.dataset.look !== edge) root.dataset.look = edge
  }, [])

  const finishActive = useCallback(() => {
    activeAnimation.current?.finish()
  }, [])

  const settle = useCallback(async (animation, duration) => {
    activeAnimation.current = animation
    // Browsers freeze animations on hidden pages, so a trip can't wait forever.
    const guard = setTimeout(() => animation.finish(), duration + STALL_MARGIN_MS)
    try {
      await animation.finished
    } catch {
      // A canceled animation just ends the trip early.
    } finally {
      clearTimeout(guard)
      if (activeAnimation.current === animation) activeAnimation.current = null
    }
  }, [])

  const walk = useCallback(async (from, to) => {
    const pace = tripsTaken > 0 ? REPEAT_TRIP_SPEED : 1
    const lite = tierRef.current === 'lite'
    const state = { from, to }

    trip.current = state
    tripsTaken += 1
    writePan(0, true)
    setTraveling(true)

    if (lite) {
      const veil = veilRef.current
      veil.style.visibility = 'visible'
      await settle(veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: VEIL_MS, fill: 'both' }), VEIL_MS)
      setStop(to)
      stopRef.current = to
      placeCamera(to)
      const reveal = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: VEIL_MS + 40, fill: 'both' })
      await settle(reveal, VEIL_MS + 40)
      veil.style.visibility = 'hidden'
      reveal.cancel()
    } else {
      const duration = WALK_MS * pace
      const animation = worldRef.current.animate([
        { transform: cameraTransform(from) },
        { transform: cameraTransform(to) },
      ], {
        duration,
        easing: 'cubic-bezier(0.42, 0, 0.58, 1)',
        fill: 'both',
      })
      await settle(animation, duration)

      setStop(state.to)
      stopRef.current = state.to
      placeCamera(state.to)
      animation.cancel()
    }

    trip.current = null
    setTraveling(false)
    headingRef.current?.focus({ preventScroll: true })

    // The visitor may have pressed back or forward during the walk.
    if (wanted.current !== stopRef.current) walk(stopRef.current, wanted.current)
  }, [cameraTransform, placeCamera, settle, writePan])

  useImperativeHandle(ref, () => ({
    // The gate looks onto the Forum, so return there before walking out.
    async prepareToLeave() {
      finishActive()
      setStop(FIRST_DISTRICT)
      stopRef.current = FIRST_DISTRICT
      placeCamera(FIRST_DISTRICT)
      writePan(0, true)
    },
  }), [finishActive, placeCamera, writePan])

  // Follow the URL, so page buttons and browser buttons walk the same way.
  useLayoutEffect(() => {
    wanted.current = district
    if (district === stopRef.current && !trip.current) return

    if (trip.current) {
      // Turning around mid-walk retraces the same path from where you are.
      const animation = activeAnimation.current
      if (district === trip.current.from && animation?.effect?.target === worldRef.current) {
        animation.reverse()
        trip.current.to = trip.current.from
      }
      return
    }

    if (active && !prefersReducedMotion()) {
      walk(stopRef.current, district)
    } else {
      setStop(district)
      stopRef.current = district
      placeCamera(district)
    }
  }, [active, district, placeCamera, walk])

  useLayoutEffect(() => {
    layoutWorld()
    placeCamera(stopRef.current)
    writePan(0, false)

    const onResize = () => {
      metrics.current = readMetrics()
      layoutWorld()
      if (!trip.current) placeCamera(stopRef.current)
      writePan(pan.current, false)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [layoutWorld, placeCamera, writePan])

  useEffect(() => () => activeAnimation.current?.cancel(), [])

  useEffect(() => {
    if (active && focusOnArrival) headingRef.current?.focus({ preventScroll: true })
  }, [active, focusOnArrival])

  const look = useCallback((direction) => {
    writePan(pan.current - direction * metrics.current.vw * 0.55, true)
  }, [writePan])

  useEffect(() => {
    if (!active) return undefined

    const onKeyDown = (event) => {
      if (trip.current) {
        finishActive()
        return
      }
      if (event.key === 'ArrowLeft') look(-1)
      if (event.key === 'ArrowRight') look(1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, finishActive, look])

  const onPointerDown = (event) => {
    if (trip.current) {
      finishActive()
      return
    }
    if (event.button !== 0 || metrics.current.maxPan <= 1) return
    suppressClick.current = false
    drag.current = { id: event.pointerId, startX: event.clientX, startPan: pan.current, moved: false }
  }

  const onPointerMove = (event) => {
    const state = drag.current
    if (!state || event.pointerId !== state.id) return

    const delta = event.clientX - state.startX
    if (!state.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD_PX) return
      state.moved = true
      suppressClick.current = true
      rootRef.current.setPointerCapture(event.pointerId)
    }
    writePan(state.startPan + delta, false)
  }

  const endDrag = (event) => {
    if (drag.current?.id === event.pointerId) drag.current = null
  }

  const onClickCapture = (event) => {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    }
  }

  const focusPlace = (event, item) => {
    if (!event.target.matches(':focus-visible')) return
    writePan((SCENE_WIDTH / 2 - (item.x + item.width / 2)) * metrics.current.scale, true)
  }

  const current = DISTRICTS[stop]
  const currentDepth = planeById(stop).depth

  const goBack = () => {
    if (current.backTo) navigate(`/city/${current.backTo}`)
    else onLeaveCity()
  }

  const classes = [
    'scenes',
    active ? 'is-active' : '',
    traveling ? 'is-traveling' : '',
    leaving ? 'is-leaving' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={rootRef}
      className={classes}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      data-look="none"
    >
      <div ref={panRef} className="scene-pan">
        <div ref={stageRef} className="scene-stage">
          <div ref={worldRef} className="scene-world">
            {[...PLANES].reverse().map((plane) => {
              const behind = !traveling && plane.depth < currentDepth ? ' is-behind' : ''
              return (
                <Fragment key={plane.id}>
                  <img
                    ref={(element) => {
                      planeRefs.current[plane.id] = element
                    }}
                    className={`scene-plane${behind}`}
                    src={SCENE_ART[plane.id]}
                    alt=""
                    decoding="sync"
                    draggable="false"
                  />
                  <div
                    ref={(element) => {
                      groundRefs.current[plane.id] = element
                    }}
                    className={`scene-ground${behind}`}
                    style={{ background: plane.ground }}
                  />
                </Fragment>
              )
            })}
          </div>
        </div>

        <nav className="scene-places" aria-label={`Places in ${current.name}`}>
          {current.places.map((place) => (
            <button
              key={place.path}
              type="button"
              className="scene-place"
              style={placeStyle(place)}
              onFocus={(event) => focusPlace(event, place)}
              onClick={() => navigate(place.path)}
            >
              <span className="scene-sign">{place.name}</span>
            </button>
          ))}

          {current.exits.map((exit) => (
            <button
              key={exit.to}
              type="button"
              className="scene-place"
              style={placeStyle(exit)}
              onFocus={(event) => focusPlace(event, exit)}
              onClick={() => navigate(`/city/${exit.to}`)}
            >
              <span className="scene-sign">{exit.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="scene-ui">
        <button
          type="button"
          className="scene-back"
          aria-label={current.backTo ? `Back to ${DISTRICTS[current.backTo].name}` : 'Back to the gate'}
          onClick={goBack}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <h1 ref={headingRef} tabIndex={-1} className="scene-title">{current.name}</h1>

        <button type="button" className="scene-look scene-look-left" aria-label="Look left" onClick={() => look(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" className="scene-look scene-look-right" aria-label="Look right" onClick={() => look(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div ref={veilRef} className="scene-veil" aria-hidden="true" />
    </div>
  )
})

export default Scenes
