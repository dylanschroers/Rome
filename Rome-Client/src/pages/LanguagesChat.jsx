import { useNavigate } from 'react-router-dom'
import ChatInterface from '../components/ChatInterface'

export default function LanguagesChat() {
  const navigate = useNavigate()

  return (
    <ChatInterface
      subject="Languages"
      onBack={() => navigate('/school')}
    />
  )
}
