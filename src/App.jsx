import { useState } from 'react'
import './App.css'
import TeamGenerator from './components/TeamGenerator.jsx'
import MatchHistory from './components/MatchHistory.jsx'
import Stats from './components/Stats.jsx'

function App() {
  const [tab, setTab] = useState('teams')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Custom LoL</h1>
        <nav className="tabs">
          <button
            className={`tab-btn ${tab === 'teams' ? 'active' : ''}`}
            onClick={() => setTab('teams')}
          >
            Génération d'équipes
          </button>
          <button
            className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            Historique des parties
          </button>
          <button
            className={`tab-btn ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
          >
            Statistiques
          </button>
        </nav>
      </header>

      <main className="app-main fade-in">
        {tab === 'teams' && <TeamGenerator />}
        {tab === 'history' && <MatchHistory />}
        {tab === 'stats' && <Stats />}
      </main>

      <footer className="app-footer">
        <small>Les données sont stockées localement dans votre navigateur.</small>
      </footer>
    </div>
  )
}

export default App