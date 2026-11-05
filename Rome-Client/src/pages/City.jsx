import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Scenes from '../components/Scenes'
import { DISTRICTS, FIRST_DISTRICT, CITY_IMAGES } from '../city/districts'
import useMotionTier from '../hooks/useMotionTier'
import doorLeft from '../assets/scenes/door-left.webp'
import doorRight from '../assets/scenes/door-right.webp'
import flame from '../assets/scenes/flame.webp'
import gateWall from '../assets/scenes/gate-wall.webp'
import town from '../assets/scenes/town.webp'
// Town.css still holds the header and footer styles other pages rely on.
import './Town.css'
import '../styles/City.css'

const TRANSITION_MS = { full: 1820, lite: 1040 }
const LOAD_LIMIT_MS = 1500

// Decoded images are kept here so returning to the city never decodes them again.
const keptImages = []
let gateReady = null
let cityImagesRequested = false

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
    decodeAll([town, gateWall, doorLeft, doorRight, flame]),
    // A slow or stalled decode should never leave the visitor locked out.
    new Promise((resolve) => setTimeout(resolve, LOAD_LIMIT_MS)),
  ])
  return gateReady
}

function loadCityImages() {
  if (cityImagesRequested) return
  cityImagesRequested = true
  decodeAll(CITY_IMAGES)
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function SceneImage(props) {
  return <img alt="" decoding="sync" draggable="false" {...props} />
}

// The gate and the city scenes are one stage that stays loaded while the URL
// changes. The URL decides where the visitor should be, so the page buttons and
// the browser's back and forward buttons all run the same transition.
export default function City() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathDistrict = pathname.startsWith('/city/') ? pathname.split('/')[2] : null
  const target = pathDistrict ? 'inside' : 'outside'
  const district = DISTRICTS[pathDistrict] ? pathDistrict : FIRST_DISTRICT
  const [phase, setPhase] = useState(target)
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const lastTarget = useRef(target)
  const walked = useRef(false)
  const enterButtonRef = useRef(null)
  const scenesRef = useRef(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const tier = useMotionTier({ phase, ready })

  useEffect(() => {
    let active = true
    loadGate().then(() => {
      if (active) setReady(true)
      loadCityImages()
    })
    return () => {
      active = false
    }
  }, [])

  useLayoutEffect(() => {
    if (lastTarget.current === target) return
    lastTarget.current = target

    if (target === 'inside') {
      setLeaving(false)
      if (prefersReducedMotion()) {
        setPhase('inside')
      } else {
        walked.current = true
        setPhase('entering')
      }
      return
    }

    // Leaving: the view first returns to what's seen through the gate.
    const leave = async () => {
      if (phaseRef.current === 'inside') {
        setLeaving(true)
        await scenesRef.current?.prepareToLeave()
      }
      if (lastTarget.current !== 'outside') return

      setLeaving(false)
      if (prefersReducedMotion()) {
        setPhase('outside')
      } else {
        walked.current = true
        setPhase('returning')
      }
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
    if (phase === 'outside' && walked.current && ready) {
      enterButtonRef.current?.focus({ preventScroll: true })
    }
  }, [phase, ready])

  const enter = () => {
    if (phase === 'outside' && ready) navigate(`/city/${FIRST_DISTRICT}`)
  }

  return (
    <main className={`city is-${phase} is-${tier}${ready ? ' is-ready' : ''}`}>
      <div className="city-scene">
        <SceneImage className="city-town" src={town} />

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

      <Scenes
        ref={scenesRef}
        active={phase === 'inside'}
        district={district}
        tier={tier}
        leaving={leaving}
        focusOnArrival={walked.current}
        onLeaveCity={() => navigate('/')}
      />

      {phase !== 'inside' && (
        <>
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
        </>
      )}
    </main>
  )
}
