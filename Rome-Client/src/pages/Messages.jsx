import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { townAddress } from '../game/places'

export default function Messages() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [userId, setUserId] = useState(null)
  const socketRef = useRef(null)

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

  return (
    <div className="messages-page">
      <header className="header">
        <div className="header-content">
          <h1>When In Rome</h1>
          <p className="user-id">ID: {userId}</p>
        </div>
        <button onClick={() => navigate(townAddress('tavern'))} className="back-btn">← Back to town</button>
      </header>

      <main className="main-content">
        <section className="message-board">
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
        </section>
      </main>

      <footer className="footer">
        <p>&copy; Rome</p>
      </footer>
    </div>
  )
}
