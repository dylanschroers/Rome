import { useEffect, useState } from 'react'

const STORAGE_KEY = 'rome-motion-tier'
const IDLE_SAMPLE_MS = 1500
const MOVING_SAMPLE_MS = 1700
const MIN_FRAMES = 20
const SLOW_MEDIAN_MS = 28
const SLOW_P90_MS = 50
// Longer gaps mean the page was hidden or throttled, so they say nothing about the device.
const THROTTLED_GAP_MS = 200

function storedTier() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function rememberTier(tier) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, tier)
  } catch {
    // Storage can be blocked. The tier still applies until the page reloads.
  }
}

function forcedTier() {
  const value = new URLSearchParams(window.location.search).get('motion')
  return value === 'lite' || value === 'full' ? value : null
}

function sampleFrames(duration, onDone) {
  const gaps = []
  const start = performance.now()
  let last = start
  let frame = requestAnimationFrame(function tick(now) {
    if (now - last < THROTTLED_GAP_MS) gaps.push(now - last)
    last = now

    if (now - start < duration) {
      frame = requestAnimationFrame(tick)
    } else {
      onDone(gaps)
    }
  })

  return () => cancelAnimationFrame(frame)
}

function isSlow(gaps) {
  if (gaps.length < MIN_FRAMES) return false

  const sorted = [...gaps].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length * 0.5)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]
  return median >= SLOW_MEDIAN_MS || p90 >= SLOW_P90_MS
}

// Starts with the full transition and drops to the lighter one for the rest of
// the session if the device can't keep up. It never switches back on its own.
export default function useMotionTier({ phase, ready }) {
  const [forced] = useState(forcedTier)
  const [tier, setTier] = useState(() => forced || (storedTier() === 'lite' ? 'lite' : 'full'))

  useEffect(() => {
    if (!ready || forced || tier === 'lite') return undefined

    const moving = phase === 'entering' || phase === 'returning'
    return sampleFrames(moving ? MOVING_SAMPLE_MS : IDLE_SAMPLE_MS, (gaps) => {
      if (isSlow(gaps)) {
        rememberTier('lite')
        setTier('lite')
      }
    })
  }, [forced, phase, ready, tier])

  return tier
}
