import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')

  return (
    <div className="app-container">
      <header className="header">
        <h1>Welcome to React UI</h1>
        <p>A simple and modern interface</p>
      </header>

      <main className="main-content">
        <section className="card">
          <h2>Counter</h2>
          <div className="counter">
            <button onClick={() => setCount(count - 1)}>−</button>
            <span className="count-display">{count}</span>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
          <button 
            className="reset-btn"
            onClick={() => setCount(0)}
          >
            Reset
          </button>
        </section>

        <section className="card">
          <h2>User Input</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
          {name && <p className="greeting">Hello, {name}! 👋</p>}
        </section>

        <section className="card">
          <h2>Features</h2>
          <ul className="features-list">
            <li>⚡ Built with React</li>
            <li>🎨 Modern styling</li>
            <li>🔄 Interactive components</li>
            <li>📱 Responsive design</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Basic React UI. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
