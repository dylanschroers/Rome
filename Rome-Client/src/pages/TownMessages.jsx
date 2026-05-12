import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import './TownMessages.css'

export default function TownMessages() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [userId, setUserId] = useState(null)
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Generate random userId on mount
  useEffect(() => {
    const randomId = 'user_' + Math.random().toString(36).substr(2, 9)
    setUserId(randomId)
  }, [])

  // Connect to server and set up Socket.io
  useEffect(() => {
    if (!userId) return

    socketRef.current = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    // Receive initial messages when connecting
    socketRef.current.on('messages:init', (initialMessages) => {
      console.log('Received initial messages:', initialMessages)
      setMessages(initialMessages)
    })

    // Listen for new messages from other users
    socketRef.current.on('message:new', (message) => {
      console.log('New message:', message)
      setMessages(prev => [...prev, message])
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [userId])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle sending message
  const handleSendMessage = (e) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !socketRef.current) return

    socketRef.current.emit('message:post', {
      userId,
      content: inputValue
    })

    setInputValue('')
  }

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
    <div className="town-messages-page">
      <header className="header">
        <div className="header-content">
          <h1>When In Rome</h1>
          <p className="user-id">ID: {userId}</p>
        </div>
        <button onClick={() => navigate('/')} className="back-btn">← Back</button>
      </header>

      <main className="combined-main">
        {/* Left side - Town */}
        <section className="town-section">
          <h2>Town of Rome</h2>
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
        </section>

        {/* Right side - Messages */}
        <section className="messages-section">
          <h2>Message Board</h2>
          <div className="message-board">
            <div className="messages-container">
              {messages.length === 0 ? (
                <p className="no-messages">No messages yet. Be the first to post!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="message">
                    <div className="message-header">
                      <strong className={msg.userId === userId ? 'own-user' : ''}>
                        {msg.userId}
                      </strong>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="send-btn">Send</button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; Rome - Town & Messages Combined</p>
      </footer>
    </div>
  )
}
