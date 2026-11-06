import { atTheBar, initials, seatsTaken } from './room'

const SEAT_SPOTS = ['top', 'right', 'bottom', 'left']

function Seat({ table, index, occupant, mine, busy, onSit }) {
  const spot = SEAT_SPOTS[index] || 'top'
  if (occupant) {
    return (
      <span
        className={`tavern-seat is-${spot} is-taken${mine ? ' is-mine' : ''}`}
        title={occupant.name}
        aria-label={mine ? `You, seat ${index + 1}` : `${occupant.name}, seat ${index + 1}`}
        role="img"
      >
        {initials(occupant.name)}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={`tavern-seat is-${spot}`}
      aria-label={`Sit at ${table.name}, seat ${index + 1}`}
      disabled={busy}
      onClick={() => onSit(table.id, index)}
    />
  )
}

function TableCard({ table, me, busy, onSit, onLeave }) {
  const taken = seatsTaken(table)
  const full = taken === table.seats.length
  const mine = table.seats.some((occupant) => occupant?.id === me)
  const names = table.seats.filter(Boolean).map((occupant) => (occupant.id === me ? 'You' : occupant.name))

  return (
    <li className={`tavern-table${mine ? ' is-mine' : ''}${full ? ' is-full' : ''}`} data-table={table.id}>
      <div className="tavern-table-spot">
        <button
          type="button"
          className="tavern-tabletop"
          aria-label={mine ? `${table.name}, your table` : full ? `${table.name}, full` : `Sit at ${table.name}`}
          disabled={busy || full || mine}
          onClick={() => onSit(table.id)}
        >
          <span aria-hidden="true">{taken}/{table.seats.length}</span>
        </button>
        {table.seats.map((occupant, index) => (
          <Seat
            key={index}
            table={table}
            index={index}
            occupant={occupant}
            mine={occupant?.id === me}
            busy={busy}
            onSit={onSit}
          />
        ))}
      </div>
      <p className="tavern-table-name">{table.name}</p>
      <p className="tavern-table-people">{names.length ? names.join(', ') : 'Empty'}</p>
      {mine && (
        <button type="button" className="tavern-leave" onClick={onLeave} disabled={busy}>
          Leave table
        </button>
      )}
    </li>
  )
}

export default function TablesPanel({ tavern, me, busy, hidden, onSit, onLeave }) {
  const bar = atTheBar(tavern.here, tavern.tables)

  return (
    <section id="tavern-tables" className="tavern-tables" aria-label="Tables" hidden={hidden}>
      {tavern.tables.length === 0 && <p className="tavern-empty">The tables show up once you're connected.</p>}
      <ul className="tavern-table-grid">
        {tavern.tables.map((table) => (
          <TableCard key={table.id} table={table} me={me} busy={busy} onSit={onSit} onLeave={onLeave} />
        ))}
      </ul>
      <p className="tavern-bar">
        <span className="tavern-bar-label">At the bar</span>
        {bar.length ? bar.map((guest) => (guest.id === me ? 'You' : guest.name)).join(', ') : 'Nobody'}
      </p>
    </section>
  )
}
