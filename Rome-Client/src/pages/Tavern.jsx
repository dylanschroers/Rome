import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GamePanel from '../games/GamePanel'
import ChatLog from '../tavern/ChatLog'
import TablesPanel from '../tavern/TablesPanel'
import { MAX_NAME, cleanName, readGuest, saveGuest } from '../tavern/guest'
import { MAX_MESSAGE } from '../tavern/messages'
import { findSeat, refusalText } from '../tavern/room'
import useTavern from '../tavern/useTavern'
import { townAddress } from '../world/places'
import '../styles/Tavern.css'

const WIDE_SCREEN = '(min-width: 900px)'
const NOTICE_MS = 4000

function useWideScreen() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_SCREEN).matches)
  useEffect(() => {
    const query = window.matchMedia(WIDE_SCREEN)
    const onChange = () => setWide(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return wide
}

function statusText(status, count) {
  if (status === 'online') return count > 1 ? `In the common room · ${count} here` : 'In the common room'
  if (status === 'offline') return "Can't reach the tavern right now"
  return 'Finding a seat…'
}

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

function Tab({ id, label, selected, disabled, unread, onSelect }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      className={`tavern-tab${unread ? ' has-unread' : ''}`}
      aria-selected={selected}
      aria-controls={`tavern-${id}`}
      disabled={disabled}
      onClick={() => onSelect(id)}
    >
      {label}
      {unread && (
        <>
          <span className="tavern-unread" aria-hidden="true" />
          <span className="tavern-hidden-text"> · new messages</span>
        </>
      )}
    </button>
  )
}

export default function Tavern() {
  const navigate = useNavigate()
  const wide = useWideScreen()
  const [guest, setGuest] = useState(() => readGuest())
  const { status, me, roomMessages, roomHistory, tavern, table, tableGame, say, sayAtTable, sit, leaveTable, startGame, playGame } = useTavern(guest)
  const [view, setView] = useState(() => (window.matchMedia(WIDE_SCREEN).matches ? 'room' : 'tables'))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [gameBusy, setGameBusy] = useState(false)
  const [leftPane, setLeftPane] = useState('game')
  const [notice, setNotice] = useState('')
  const [seen, setSeen] = useState({ room: 0, table: 0 })
  const noticeTimer = useRef(null)
  const inputRef = useRef(null)

  const seat = findSeat(tavern.tables, me)
  const tableMessages = seat && table.id === seat.table.id ? table.messages : []
  const game = seat && tableGame.tableId === seat.table.id ? tableGame.game : null
  const chat = view === 'table' && seat ? 'table' : 'room'
  const showTables = wide || view === 'tables'
  const showChat = wide || view !== 'tables'

  const seatedAt = seat?.table.id ?? null
  const lastSeat = useRef(seatedAt)
  useEffect(() => {
    if (lastSeat.current && !seatedAt) setView((current) => (current === 'table' ? (wide ? 'room' : 'tables') : current))
    lastSeat.current = seatedAt
  }, [seatedAt, wide])

  useEffect(() => {
    if (!showChat) return
    setSeen((previous) => (chat === 'room'
      ? { ...previous, room: roomMessages.length }
      : { ...previous, table: tableMessages.length }))
  }, [chat, roomMessages.length, showChat, tableMessages.length])

  useEffect(() => {
    setSeen((previous) => ({ ...previous, table: 0 }))
  }, [seatedAt])

  useEffect(() => {
    setSeen((previous) => ({ ...previous, room: Math.max(previous.room, roomHistory) }))
  }, [roomHistory])

  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  const tell = (text) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS)
  }

  const rename = (name) => {
    const next = { ...guest, name }
    setGuest(next)
    saveGuest(next)
  }

  const sitDown = async (tableId, seatIndex) => {
    setBusy(true)
    const result = await sit(tableId, seatIndex)
    setBusy(false)
    if (!result.ok) {
      tell(refusalText(result.reason))
      return
    }
    setView('table')
    setLeftPane('game')
  }

  const standUp = async () => {
    setBusy(true)
    const result = await leaveTable()
    setBusy(false)
    if (!result.ok) tell(refusalText(result.reason))
    setView(wide ? 'room' : 'tables')
  }

  const runGame = async (request) => {
    setGameBusy(true)
    const result = await request()
    setGameBusy(false)
    if (!result.ok) tell(refusalText(result.reason))
  }

  const send = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || status !== 'online') return
    setDraft('')
    const result = await (chat === 'table' ? sayAtTable(content) : say(content))
    if (!result.ok) {
      setDraft(content)
      tell(refusalText(result.reason))
    }
  }

  const unread = {
    room: chat !== 'room' || !showChat ? roomMessages.length > seen.room : false,
    table: chat !== 'table' || !showChat ? tableMessages.length > seen.table : false,
  }
  const tabs = [
    !wide && { id: 'tables', label: 'Tables' },
    { id: 'room', label: wide ? 'Common room' : 'Room' },
    { id: 'table', label: seat ? seat.table.name : 'Your table', disabled: !seat },
  ].filter(Boolean)
  const selectedTab = wide ? chat : view === 'tables' ? 'tables' : chat
  const placeholder = chat === 'table' ? `Say something to ${seat.table.name}` : 'Say something to the room'
  const tabList = (
    <div className="tavern-tabs" role="tablist" aria-label="Tavern views">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          {...tab}
          selected={selectedTab === tab.id}
          unread={unread[tab.id]}
          onSelect={setView}
        />
      ))}
    </div>
  )

  const tablesPanel = (
    <TablesPanel
      tavern={tavern}
      me={me}
      busy={busy || status !== 'online'}
      hidden={!showTables}
      onSit={sitDown}
      onLeave={standUp}
    />
  )
  const gamePanel = seat && (
    <GamePanel
      table={seat.table}
      game={game}
      me={me}
      busy={gameBusy || status !== 'online'}
      onStart={(gameId) => runGame(() => startGame(gameId))}
      onAct={(action) => runGame(() => playGame(action))}
    />
  )

  return (
    <div className={`tavern${wide ? ' is-wide' : ''}`}>
      <div className="tavern-glow" aria-hidden="true" />

      <header className="tavern-top">
        <button type="button" className="tavern-back" aria-label="Back to town" onClick={() => navigate(townAddress('tavern'))}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="tavern-title">
          <h1>Tavern</h1>
          <p className={`tavern-status is-${status}`} role="status">{statusText(status, tavern.here.length)}</p>
        </div>
      </header>

      <div className="tavern-room">
        {!wide && tabList}
        {wide && seat ? (
          <section className="tavern-play">
            <div className="tavern-pane-switch" role="group" aria-label="Left side shows">
              <button type="button" aria-pressed={leftPane === 'game'} onClick={() => setLeftPane('game')}>{seat.table.name}</button>
              <button type="button" aria-pressed={leftPane === 'tables'} onClick={() => setLeftPane('tables')}>All tables</button>
            </div>
            {leftPane === 'game' ? gamePanel : tablesPanel}
          </section>
        ) : tablesPanel}

        <main className={`tavern-chat${chat === 'table' ? ' is-table' : ''}`} hidden={!showChat}>
          {wide && tabList}

          {showChat && (
            <>
              <ChatLog
                id="tavern-room"
                label="Common room chat"
                messages={roomMessages}
                ownId={guest.id}
                hidden={chat !== 'room'}
                emptyText={status === 'offline' ? 'The common room is closed for now.' : 'The room is quiet. Say something to start the talk.'}
              />
              {!wide && chat === 'table' && seat && gamePanel}
              <ChatLog
                id="tavern-table"
                label={seat ? `${seat.table.name} chat` : 'Table chat'}
                messages={tableMessages}
                ownId={guest.id}
                hidden={chat !== 'table'}
                emptyText={seat ? `You sat down at ${seat.table.name}. Say hello to the table.` : ''}
              />

              <form className="tavern-composer" onSubmit={send}>
                <NameTag key={guest.name} guest={guest} onRename={rename} />
                <div className="tavern-say">
                  <input
                    ref={inputRef}
                    className="tavern-input"
                    value={draft}
                    maxLength={MAX_MESSAGE}
                    placeholder={placeholder}
                    aria-label={chat === 'table' ? 'Message to your table' : 'Message to the room'}
                    autoComplete="off"
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <button type="submit" className="tavern-send" disabled={!draft.trim() || status !== 'online'}>
                    Send
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="tavern-notice" role="status" aria-live="polite">{notice}</p>
        </main>
      </div>
    </div>
  )
}
