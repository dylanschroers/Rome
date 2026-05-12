import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1>Welcome to Rome</h1>
        <p className="subtitle">End-to-end encrypted messaging</p>
        
        <div className="welcome-description">
          <p>A secure, decentralized messaging platform where your conversations stay private.</p>
          <ul className="features">
            <li>Real-time messaging</li>
            <li>Simple and intuitive</li>
            <li>No account required</li>
          </ul>
        </div>

        <div className="button-group">
          <button onClick={() => navigate('/messages')} className="enter-btn">
            Enter Messages
          </button>
          <button onClick={() => navigate('/town')} className="enter-btn town-btn">
            Explore Town
          </button>
          <button onClick={() => navigate('/town-messages')} className="enter-btn combined-btn">
            Town & Messages
          </button>
        </div>
      </div>
    </div>
  )
}
