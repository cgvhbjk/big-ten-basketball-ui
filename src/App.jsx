import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import TeamsHub from './pages/TeamsHub.jsx'
import PlayerLab from './pages/PlayerLab.jsx'

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: '#0e0e0e' }}>
      {/* Keyboard users can jump straight past the nav to the page content */}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/"         element={<Navigate to="/teams" replace />} />
          <Route path="/teams"    element={<TeamsHub />} />
          <Route path="/players"  element={<PlayerLab />} />
          {/* Old deep-links keep working */}
          <Route path="/analyzer" element={<Navigate to="/teams" replace />} />
          <Route path="/insights" element={<Navigate to="/teams" replace />} />
          <Route path="/epa"      element={<Navigate to="/teams" replace />} />
        </Routes>
      </main>
    </div>
  )
}
