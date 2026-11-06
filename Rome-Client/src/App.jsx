import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import './styles/Pages.css'
import Tavern from './pages/Tavern'
import City from './pages/City'
import NotFound from './pages/NotFound'
import School from './pages/School'
import LanguagesChat from './pages/LanguagesChat'
import { TOWN_PATH, legacyAddress } from './world/places'
import './App.css'

function OldAddress() {
  const { pathname, search } = useLocation()
  return <Navigate to={legacyAddress(pathname, search) || TOWN_PATH} replace />
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route element={<City />}>
            <Route path="/" element={null} />
            <Route path={TOWN_PATH} element={null} />
          </Route>
          <Route path="/town-test" element={<OldAddress />} />
          <Route path="/town-messages" element={<OldAddress />} />
          <Route path="/city/*" element={<OldAddress />} />
          <Route path="/tavern" element={<Tavern />} />
          <Route path="/messages" element={<Navigate to="/tavern" replace />} />
          <Route path="/school" element={<School />} />
          <Route path="/school/languages" element={<LanguagesChat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
export default App
