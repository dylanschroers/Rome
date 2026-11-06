import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { MAX_NAME, cleanName, readGuest, saveGuest } from '../tavern/guest'
import { MAX_MESSAGE, groupMessages } from '../tavern/messages'
import { townAddress } from '../world/places'
import '../styles/Tavern.css'

const SERVER = 'http://localhost:3001'
const STICK_TO_BOTTOM_PX = 80
const STATUS_TEXT = {
  connecting: 'Finding a seat…',
  online: 'In the common room',
  offline: "Can't reach the tavern right now",
}

const timeOf = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function NameTag({ guest, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(guest.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const finish = (save) => {
    const name = cleanName(draft)
    if (save && name) onRename(name)
    setDraft(save && name ? name : guest.name)
    setEditing(false)
  }

  if (!editing) {
    return (
      <p className="tavern-speaker">
        Speaking as{' '}
        <button type="button" className="tavern-name-button" onClick={() => setEditing(true)} aria-label={`Speaking as ${guest.name}. Change your name`}>
          {guest.name}
        </button>
      </p>
    )
  }

  return (
    <p className="tavern-speaker">
      <label htmlFor="tavern-name">Your name</label>
      <input
        id="tavern-name"
        ref={inputRef}
        className="tavern-name-input"
        value={draft}
        maxLength={MAX_NAME}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            finish(true)
          } else if (event.key === 'Escape') {
            finish(false)
          }
        }}
        onBlur={() => finish(true)}
      />
    </p>
  )
}

export default function Tavern() {
  const navigate = useNavigate()
  const [guest, setGuest] = useState(() => readGuest())
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('connecting')
  const socketRef = useRef(null)
  const boardRef = useRef(null)
  const stickRef = useRef(true)

  useEffect(() => {
    const socket = io(SERVER, { reconnectionDelay: 1000, reconnectionDelayMax: 8000 })
    socketRef.current = socket
    socket.on('connect', () => setStatus('online'))
    socket.on('connect_error', () => setStatus('offline'))
    socket.on('disconnect', () => setStatus('offline'))
    socket.on('messages:init', (initial) => setMessages(Array.isArray(initial) ? initial : []))
    socket.on('message:new', (message) => setMessages((previous) => [...previous, message]))
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useLayoutEffect(() => {
    const board = boardRef.current
    if (board && stickRef.current) board.scrollTop = board.scrollHeight
  }, [messages])

  const onScroll = () => {
    const board = boardRef.current
    stickRef.current = board.scrollHeight - board.scrollTop - board.clientHeight < STICK_TO_BOTTOM_PX
  }

  const rename = (name) => {
    const next = { ...guest, name }
    setGuest(next)
    saveGuest(next)
  }

  const send = (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || status !== 'online') return
    socketRef.current.emit('message:post', { userId: guest.id, name: guest.name, content })
    stickRef.current = true
    setDraft('')
  }

  const groups = groupMessages(messages)

  return (
    <div className="tavern">
      <div className="tavern-glow" aria-hidden="true" />

      <header className="tavern-top">
        <button type="button" className="tavern-back" aria-label="Back to town" onClick={() => navigate(townAddress('tavern'))}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="tavern-title">
          <h1>Tavern</h1>
          <p className={`tavern-status is-${status}`} role="status">{STATUS_TEXT[status]}</p>
        </div>
      </header>

      <main className="tavern-room">
        <section
          ref={boardRef}
          className="tavern-board"
          role="log"
          aria-live="polite"
          aria-label="Common room chat"
          tabIndex={0}
          onScroll={onScroll}
        >
          {groups.length === 0 && (
            <p className="tavern-empty">
              {status === 'offline' ? 'The common room is closed for now.' : 'The room is quiet. Say something to start the talk.'}
            </p>
          )}
          {groups.map((group) => {
            const own = group.userId === guest.id
            return (
              <article key={group.key} className={`tavern-turn${own ? ' is-own' : ''}`}>
                <header className="tavern-turn-head">
                  <strong className="tavern-author">{own ? `${group.name} (you)` : group.name}</strong>
                  <time className="tavern-time" dateTime={group.messages[0].timestamp}>{timeOf(group.messages[0].timestamp)}</time>
                </header>
                {group.messages.map((message) => (
                  <p key={message.id ?? message.timestamp} className="tavern-line">{message.content}</p>
                ))}
              </article>
            )
          })}
        </section>

        <form className="tavern-composer" onSubmit={send}>
          <NameTag key={guest.name} guest={guest} onRename={rename} />
          <div className="tavern-say">
            <input
              className="tavern-input"
              value={draft}
              maxLength={MAX_MESSAGE}
              placeholder="Say something to the room"
              aria-label="Message"
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="tavern-send" disabled={!draft.trim() || status !== 'online'}>
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
