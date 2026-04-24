import { useNavigate } from 'react-router-dom'
import './Town.css'

export default function Town() {
  const navigate = useNavigate()

  const buildingData = [
    { id: 1, width: 120, height: 80, color: '#e74c3c', label: 'School', path: '/school' },
    { id: 2, width: 120, height: 80, color: '#3498db', label: 'Library', path: '/library' },
    { id: 3, width: 120, height: 80, color: '#f39c12', label: 'Market', path: '/market' },
    { id: 4, width: 120, height: 80, color: '#9b59b6', label: 'Temple', path: '/temple' },
    { id: 5, width: 120, height: 80, color: '#1abc9c', label: 'Theater', path: '/theater' },
    { id: 6, width: 120, height: 80, color: '#e67e22', label: 'Smithy', path: '/smithy' },
  ]

  // Calculate circular positions for buildings around empty center space
  const centerX = 280
  const centerY = 220
  const radius = 180

  const buildings = buildingData.map((building, index) => {
    const angle = (Math.PI * 2 / buildingData.length) * index
    const cx = centerX + radius * Math.cos(angle)
    const cy = centerY + radius * Math.sin(angle)
    return {
      ...building,
      x: cx - building.width / 2,
      y: cy - building.height / 2,
    }
  })

  return (
    <div className="town-page">
      <header className="header">
        <div className="header-content">
          <h1>Town of Rome</h1>
          <p className="subtitle">Click on buildings to explore</p>
        </div>
        <button onClick={() => navigate('/')} className="back-btn">← Back</button>
      </header>

      <main className="main-content">
        <svg className="town-map" viewBox="0 0 560 440" preserveAspectRatio="xMidYMid meet">
          {/* Background - grass */}
          <rect width="560" height="440" fill="#90ee90" />

          {/* Empty circular space in center */}
          <circle cx="280" cy="220" r="100" fill="#b8d4e6" opacity="0.6" />
          <circle cx="280" cy="220" r="100" fill="none" stroke="#666" strokeWidth="2" strokeDasharray="5,5" />

          {/* Buildings */}
          {buildings.map((building) => (
            <g
              key={building.id}
              onClick={() => navigate(building.path)}
              className="building"
              style={{ cursor: 'pointer' }}
            >
              {/* Building main */}
              <rect
                x={building.x}
                y={building.y}
                width={building.width}
                height={building.height}
                fill={building.color}
                stroke="#333"
                strokeWidth="2"
              />

              {/* Building details - window */}
              <rect
                x={building.x + 10}
                y={building.y + 10}
                width="30"
                height="25"
                fill="#87ceeb"
                stroke="#333"
                strokeWidth="1"
              />
              <rect
                x={building.x + 50}
                y={building.y + 10}
                width="30"
                height="25"
                fill="#87ceeb"
                stroke="#333"
                strokeWidth="1"
              />

              {/* Door */}
              <rect
                x={building.x + building.width / 2 - 12}
                y={building.y + building.height - 25}
                width="24"
                height="25"
                fill="#8b4513"
                stroke="#333"
                strokeWidth="1"
              />

              {/* Label background */}
              <rect
                x={building.x}
                y={building.y + building.height + 5}
                width={building.width}
                height="25"
                fill="rgba(0,0,0,0.7)"
                rx="3"
              />

              {/* Label text */}
              <text
                x={building.x + building.width / 2}
                y={building.y + building.height + 23}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
                fontFamily="Arial"
                pointerEvents="none"
              >
                {building.label}
              </text>
            </g>
          ))}
        </svg>
      </main>

      <footer className="footer">
        <p>&copy; Rome - A town to explore</p>
      </footer>
    </div>
  )
}
