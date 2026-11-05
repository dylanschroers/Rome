import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Messages from './pages/Messages'
import City from './pages/City'
import TownTest from './pages/TownTest'
import TownMessages from './pages/TownMessages'
import School from './pages/School'
import LanguagesChat from './pages/LanguagesChat'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route element={<City />}>
            <Route path="/" element={null} />
            <Route path="/city/:district" element={null} />
          </Route>
          <Route path="/town" element={<Navigate to="/city/forum" replace />} />
          <Route path="/town-test" element={<TownTest />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/town-messages" element={<TownMessages />} />
          <Route path="/school" element={<School />} />
          <Route path="/school/languages" element={<LanguagesChat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
export default App
