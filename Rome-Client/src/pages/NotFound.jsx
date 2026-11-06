import { Link } from 'react-router-dom'
import { TOWN_PATH } from '../world/places'
import '../styles/NotFound.css'

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>This place isn't in town</h1>
      <Link to={TOWN_PATH}>Back to town</Link>
    </main>
  )
}
