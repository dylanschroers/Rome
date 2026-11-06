import { useLayoutEffect, useRef } from 'react'
import { groupMessages } from './messages'

const STICK_TO_BOTTOM_PX = 80

const timeOf = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function ChatLog({ id, label, messages, ownId, emptyText, hidden }) {
  const boardRef = useRef(null)
  const stickRef = useRef(true)

  useLayoutEffect(() => {
    const board = boardRef.current
    if (board && stickRef.current) board.scrollTop = board.scrollHeight
  }, [messages, hidden])

  const onScroll = () => {
    const board = boardRef.current
    stickRef.current = board.scrollHeight - board.scrollTop - board.clientHeight < STICK_TO_BOTTOM_PX
  }

  const groups = groupMessages(messages)

  return (
    <section
      ref={boardRef}
      id={id}
      className="tavern-board"
      role="log"
      aria-live="polite"
      aria-label={label}
      tabIndex={0}
      hidden={hidden}
      onScroll={onScroll}
    >
      {groups.length === 0 && <p className="tavern-empty">{emptyText}</p>}
      {groups.map((group) => {
        const own = group.userId === ownId
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
  )
}
