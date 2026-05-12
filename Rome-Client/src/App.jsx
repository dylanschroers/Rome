import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Messages from './pages/Messages'
import Town from './pages/Town'
import TownMessages from './pages/TownMessages'
import School from './pages/School'
import LanguagesChat from './pages/LanguagesChat'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/town" element={<Town />} />
          <Route path="/town-messages" element={<TownMessages />} />
          <Route path="/school" element={<School />} />
          <Route path="/school/languages" element={<LanguagesChat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
export default App
