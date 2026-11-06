import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER = 'http://localhost:3001'
const EMPTY_TAVERN = { here: [], tables: [] }
const NO_TABLE = { id: null, messages: [] }

// One connection to the Tavern: the common room, who is here, the tables, and your table's talk.
export default function useTavern(guest) {
  const [status, setStatus] = useState('connecting')
  const [me, setMe] = useState(null)
  const [roomMessages, setRoomMessages] = useState([])
  const [roomHistory, setRoomHistory] = useState(0)
  const [tavern, setTavern] = useState(EMPTY_TAVERN)
  const [table, setTable] = useState(NO_TABLE)
  const socketRef = useRef(null)
  const guestRef = useRef(guest)
  guestRef.current = guest

  useEffect(() => {
    const socket = io(SERVER, { reconnectionDelay: 1000, reconnectionDelayMax: 8000 })
    socketRef.current = socket

    const gone = () => {
      setStatus('offline')
      setMe(null)
      setTable(NO_TABLE)
      setTavern(EMPTY_TAVERN)
    }

    socket.on('connect', () => {
      const { id, name } = guestRef.current
      socket.emit('tavern:join', { guestId: id, name }, (result) => {
        if (result?.ok) {
          setMe(result.presenceId)
          setStatus('online')
        } else {
          gone()
        }
      })
    })
    socket.on('connect_error', gone)
    socket.on('disconnect', gone)
    socket.on('messages:init', (initial) => {
      const history = Array.isArray(initial) ? initial : []
      setRoomMessages(history)
      setRoomHistory(history.length)
    })
    socket.on('message:new', (message) => setRoomMessages((previous) => [...previous, message]))
    socket.on('tavern:state', (state) => setTavern(state && Array.isArray(state.tables) ? state : EMPTY_TAVERN))
    socket.on('table:history', ({ tableId, messages }) => setTable({ id: tableId, messages: messages || [] }))
    socket.on('table:message', ({ tableId, message }) => {
      setTable((previous) => (previous.id === tableId ? { ...previous, messages: [...previous.messages, message] } : previous))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status === 'online') socketRef.current?.emit('tavern:rename', guest.name)
  }, [guest.name, status])

  const request = useCallback((event, payload) => new Promise((resolve) => {
    const socket = socketRef.current
    if (!socket?.connected) {
      resolve({ ok: false, reason: 'offline' })
      return
    }
    const done = (result) => resolve(result || { ok: false })
    if (payload === undefined) socket.emit(event, done)
    else socket.emit(event, payload, done)
  }), [])

  const say = useCallback((content) => request('message:post', { userId: guestRef.current.id, name: guestRef.current.name, content }), [request])
  const sayAtTable = useCallback((content) => request('table:say', { content }), [request])
  const sit = useCallback((tableId, seat) => request('table:sit', { tableId, seat }), [request])

  const leaveTable = useCallback(async () => {
    const result = await request('table:leave')
    if (result.ok) setTable(NO_TABLE)
    return result
  }, [request])

  return { status, me, roomMessages, roomHistory, tavern, table, say, sayAtTable, sit, leaveTable }
}
