import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TownShell from '../town/TownShell'
import useMotionTier from '../hooks/useMotionTier'
import { TOWN_PATH } from '../world/places'
import doorLeft from '../assets/scenes/door-left.webp'
import doorRight from '../assets/scenes/door-right.webp'
import flame from '../assets/scenes/flame.webp'
import gatePassage from '../assets/scenes/gate-passage.webp'
import gateWall from '../assets/scenes/gate-wall.webp'
import '../styles/City.css'

const TRANSITION_MS = { full: 1820, lite: 1040 }
const LOAD_LIMIT_MS = 1500

// Kept so returning to the gate never decodes the images again.
const keptImages = []
let gateReady = null

function decodeAll(sources) {
  return Promise.all(
    sources.map((source) => {
      const image = new Image()
      image.src = source
      keptImages.push(image)
      return image.decode().catch(() => {})
    })
  )
}

function loadGate() {
  gateReady ||= Promise.race([
    decodeAll([gatePassage, gateWall, doorLeft, doorRight, flame]),
    new Promise((resolve) => setTimeout(resolve, LOAD_LIMIT_MS)),
  ])
  return gateReady
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function SceneImage(props) {
  return <img alt="" decoding="sync" draggable="false" {...props} />
}

// The gate and the town stay mounted together while the URL changes. The URL decides
// where the visitor should be, so page buttons and browser back and forward all run
// the same transition.
export default function City() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const target = pathname === TOWN_PATH ? 'inside' : 'outside'
  const [phase, setPhase] = useState(target)
  const [ready, setReady] = useState(false)
  const [fromTown, setFromTown] = useState(false)
  const [townMounted, setTownMounted] = useState(target === 'inside')
  const lastTarget = useRef(target)
  const walked = useRef(false)
  const arriving = useRef(false)
  const enterButtonRef = useRef(null)
  const townRef = useRef(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const tier = useMotionTier({ phase, ready })

  useEffect(() => {
    let active = true
    loadGate().then(() => {
      if (!active) return
      setReady(true)
      setTownMounted(true)
    })
    return () => {
      active = false
    }
  }, [])

  useLayoutEffect(() => {
    if (lastTarget.current === target) return
    lastTarget.current = target

    if (target === 'inside') {
      setFromTown(false)
      if (phaseRef.current === 'inside') {
        townRef.current?.fadeIn()
        return
      }
      setTownMounted(true)
      arriving.current = true
      walked.current = true
      setPhase(prefersReducedMotion() ? 'inside' : 'entering')
      return
    }

    const leave = async () => {
      if (phaseRef.current === 'inside') {
        setFromTown(true)
        await townRef.current?.fadeOut()
      }
      if (lastTarget.current !== 'outside') return

      walked.current = true
      setPhase(prefersReducedMotion() ? 'outside' : 'returning')
    }

    leave()
  }, [target])

  useEffect(() => {
    if (phase !== 'entering' && phase !== 'returning') return undefined

    const timer = setTimeout(() => {
      setPhase(phase === 'entering' ? 'inside' : 'outside')
    }, TRANSITION_MS[tier])

    return () => clearTimeout(timer)
  }, [phase, tier])

  useEffect(() => {
    if (phase !== 'inside' || !arriving.current) return
    arriving.current = false
    townRef.current?.walkIn()
    townRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase === 'outside') setFromTown(false)
    if (phase === 'outside' && walked.current && ready) {
      enterButtonRef.current?.focus({ preventScroll: true })
    }
  }, [phase, ready])

  const enter = () => {
    if (phase === 'outside' && ready) navigate(TOWN_PATH)
  }

  const leaveTown = useCallback(() => navigate('/'), [navigate])

  return (
    <div className={`city is-${phase} is-${tier}${ready ? ' is-ready' : ''}${fromTown ? ' is-from-town' : ''}`}>
      <div className="city-scene" aria-hidden={phase === 'inside'}>
        <SceneImage className="city-town" src={gatePassage} />

        <div className="city-frame" aria-hidden="true">
          <div className="city-doors">
            <SceneImage className="city-door city-door-left" src={doorLeft} />
            <SceneImage className="city-door city-door-right" src={doorRight} />
          </div>
          <SceneImage className="city-wall" src={gateWall} />
          <SceneImage className="city-flame city-flame-left" src={flame} />
          <SceneImage className="city-flame city-flame-right" src={flame} />
          <div className="city-gate-target" onClick={enter} />
        </div>
      </div>

      <div className="city-shade" aria-hidden="true" />

      {townMounted && <TownShell ref={townRef} active={phase === 'inside'} onLeave={leaveTown} />}

      {phase !== 'inside' && (
        <main className="gate-page">
          <header className="gate-title gate-ui">
            <h1>Rome</h1>
          </header>

          <button
            ref={enterButtonRef}
            type="button"
            className="gate-enter gate-ui"
            onClick={enter}
            disabled={phase !== 'outside' || !ready}
          >
            Enter the city
          </button>
        </main>
      )}
    </div>
  )
}
