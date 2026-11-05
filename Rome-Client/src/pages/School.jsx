import { useNavigate } from 'react-router-dom'
import { townAddress } from '../game/places'
import './School.css'

export default function School() {
  const navigate = useNavigate()

  const subjects = [
    { id: 1, name: 'Mathematics', color: '#e74c3c', icon: '∑', description: 'Coming soon' },
    { id: 2, name: 'Science', color: '#3498db', icon: '⚗️', description: 'Coming soon' },
    { id: 3, name: 'History', color: '#f39c12', icon: '📜', description: 'Coming soon' },
    { id: 4, name: 'Literature', color: '#9b59b6', icon: '📚', description: 'Coming soon' },
    { id: 5, name: 'Languages', color: '#1abc9c', icon: '🌍', description: 'Latin, Greek, and more', path: '/school/languages' },
    { id: 6, name: 'Philosophy', color: '#e67e22', icon: '🤔', description: 'Coming soon' },
  ]

  // Position subjects on left and right sides
  const positionedSubjects = subjects.map((subject, index) => {
    const itemsPerSide = Math.ceil(subjects.length / 2)
    const isLeftSide = index < itemsPerSide
    const positionInSide = isLeftSide ? index : index - itemsPerSide
    const spacing = 140
    const startY = 60
    
    return {
      ...subject,
      x: isLeftSide ? 30 : 320,
      y: startY + positionInSide * spacing,
    }
  })

  return (
    <div className="school-page">
      <header className="header">
        <div className="header-content">
          <h1>School of Rome</h1>
          <p className="subtitle">Select a subject to learn</p>
        </div>
        <button onClick={() => navigate(townAddress('school'))} className="back-btn">← Back to Town</button>
      </header>

      <main className="main-content">
        <svg className="school-map" viewBox="0 0 620 500" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect width="620" height="500" fill="#f5f5f5" />

          {/* Subject cards */}
          {positionedSubjects.map((subject) => (
            <g
              key={subject.id}
              {...(subject.path ? {
                onClick: () => navigate(subject.path),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(subject.path)
                  }
                },
                role: 'link',
                tabIndex: 0,
                'aria-label': subject.name,
              } : {})}
              className="subject-card"
              style={{ cursor: subject.path ? 'pointer' : 'default', opacity: subject.path ? 1 : 0.5 }}
            >
              {/* Card background */}
              <rect
                x={subject.x}
                y={subject.y}
                width="260"
                height="120"
                fill={subject.color}
                stroke="#333"
                strokeWidth="2"
                rx="8"
                opacity="0.9"
              />

              {/* Icon area */}
              <circle
                cx={subject.x + 50}
                cy={subject.y + 30}
                r="25"
                fill="rgba(255,255,255,0.3)"
                stroke="white"
                strokeWidth="2"
              />

              {/* Icon text */}
              <text
                x={subject.x + 50}
                y={subject.y + 38}
                textAnchor="middle"
                fill="white"
                fontSize="28"
                fontFamily="Arial"
                pointerEvents="none"
              >
                {subject.icon}
              </text>

              {/* Subject name */}
              <text
                x={subject.x + 130}
                y={subject.y + 35}
                fill="white"
                fontSize="16"
                fontWeight="bold"
                fontFamily="Arial"
                pointerEvents="none"
              >
                {subject.name}
              </text>

              {/* Description */}
              <text
                x={subject.x + 130}
                y={subject.y + 58}
                fill="rgba(255,255,255,0.9)"
                fontSize="12"
                fontFamily="Arial"
                pointerEvents="none"
              >
                {subject.description}
              </text>

              {/* Bottom accent line */}
              <rect
                x={subject.x}
                y={subject.y + 110}
                width="260"
                height="3"
                fill="rgba(255,255,255,0.5)"
              />
            </g>
          ))}
        </svg>
      </main>

      <footer className="footer">
        <p>&copy; School of Rome - Knowledge is Power</p>
      </footer>
    </div>
  )
}
