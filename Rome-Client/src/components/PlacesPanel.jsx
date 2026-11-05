import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled])'
const MAP_PIXELS = 416

export default function PlacesPanel({ map, drawMiniMap, onGo, onEnter, onClose }) {
  const panelRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    drawMiniMap(canvasRef.current)
    panelRef.current.querySelector('.places-go')?.focus()
  }, [drawMiniMap])

  const onKeyDown = (event) => {
    if (event.key === 'Escape' || event.code === 'KeyM') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="places-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="places-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="places-title"
        onKeyDown={onKeyDown}
      >
        <header className="places-header">
          <h2 id="places-title">Places</h2>
          <button type="button" className="places-close" onClick={onClose}>Close</button>
        </header>

        <canvas
          ref={canvasRef}
          className="places-map"
          width={MAP_PIXELS}
          height={Math.round((MAP_PIXELS * map.height) / map.width)}
          aria-hidden="true"
        />

        {map.groups.map((group) => (
          <section key={group.id} className="places-district" aria-label={group.name}>
            <h3>{group.name}</h3>
            <ul>
              {map.buildings.filter((item) => item.id && item.district === group.id).map((place) => (
                <li key={place.id} className={place.open ? 'is-open' : ''}>
                  <span className="places-name">
                    {place.name}
                    {!place.open && <span className="places-closed"> (not open yet)</span>}
                  </span>
                  <span className="places-actions">
                    <button type="button" className="places-go" aria-label={`Go to ${place.name}`} onClick={() => onGo(place)}>
                      Go
                    </button>
                    {place.open && (
                      <button type="button" className="places-enter" aria-label={`Enter ${place.name}`} onClick={() => onEnter(place)}>
                        Enter
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
