import { Link } from 'react-router-dom'
import { TOWN_PATH } from '../game/places'
import '../styles/TownTest.css'

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>This place isn't in town</h1>
      <Link to={TOWN_PATH}>Back to town</Link>
    </main>
  )
}
