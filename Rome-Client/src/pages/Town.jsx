import { useNavigate } from 'react-router-dom'
import './Town.css'

export default function Town() {
  const navigate = useNavigate()

  const buildings = [
    { id: 1, x: 50, y: 50, width: 120, height: 80, color: '#e74c3c', label: 'Tavern', path: '/tavern' },
    { id: 2, x: 220, y: 50, width: 120, height: 80, color: '#3498db', label: 'Library', path: '/library' },
    { id: 3, x: 390, y: 50, width: 120, height: 80, color: '#f39c12', label: 'Market', path: '/market' },
    { id: 4, x: 50, y: 180, width: 120, height: 80, color: '#9b59b6', label: 'Temple', path: '/temple' },
    { id: 5, x: 220, y: 180, width: 120, height: 80, color: '#1abc9c', label: 'Theater', path: '/theater' },
    { id: 6, x: 390, y: 180, width: 120, height: 80, color: '#e67e22', label: 'Smithy', path: '/smithy' },
    { id: 7, x: 50, y: 310, width: 120, height: 80, color: '#2ecc71', label: 'Garden', path: '/garden' },
    { id: 8, x: 220, y: 310, width: 120, height: 80, color: '#34495e', label: 'Guard Tower', path: '/tower' },
    { id: 9, x: 390, y: 310, width: 120, height: 80, color: '#c0392b', label: 'Inn', path: '/inn' },
  ]

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

          {/* Roads */}
          <rect x="0" y="140" width="560" height="40" fill="#8b7355" />
          <rect x="170" y="0" width="40" height="440" fill="#8b7355" />

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

          {/* Well in center (decorative) */}
          <circle cx="280" cy="190" r="25" fill="#696969" stroke="#333" strokeWidth="2" />
          <circle cx="280" cy="190" r="20" fill="#8b7355" />
        </svg>
      </main>

      <footer className="footer">
        <p>&copy; Rome - A town to explore</p>
      </footer>
    </div>
  )
}
