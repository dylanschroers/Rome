import { useState, useEffect, useRef } from 'react'
import '../styles/ChatInterface.css'

export default function ChatInterface({ subject, onBack }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hello! I'm your ${subject} tutor. How can I help you learn today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages([...messages, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call local LLM API on Rome-Server
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject,
          message: inputValue,
          history: messages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from LLM')
      }

      const data = await response.json()
      const botMessage = {
        id: messages.length + 2,
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        id: messages.length + 2,
        text: 'Sorry, I encountered an error. Please make sure the local LLM server is running on port 3001.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>{subject}</h1>
        <button onClick={onBack} className="back-btn">
          ← Back to School
        </button>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-bubble">
              <p>{message.text}</p>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about this subject..."
          className="message-input"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          className="send-btn"
          disabled={isLoading || !inputValue.trim()}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
