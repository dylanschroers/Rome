import { useLocation, useNavigate } from 'react-router-dom'
import { townAddress } from '../game/places'
import ChatInterface from '../components/ChatInterface'

export default function LanguagesChat() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fromTown = state?.from === 'town'

  return (
    <ChatInterface
      subject="Languages"
      onBack={() => navigate(fromTown ? townAddress('language-stall') : '/school')}
      backLabel={fromTown ? 'Back to Market row' : 'Back to School'}
    />
  )
}
