import { useState, useEffect } from 'react'
import './App.css'
import TabNavigation from './components/TabNavigation'
import OverviewView from './views/OverviewView'
import DataView from './views/DataView'
import InfoView from './views/InfoView'

export const TABS = [
  { id: 'uebersicht', label: 'Übersicht', icon: '🏔' },
  { id: 'daten',      label: 'Daten',     icon: '📊' },
  { id: 'info',       label: 'Info',      icon: 'ℹ️' },
]

function hashToTab(hash) {
  const id = hash.replace('#', '')
  return TABS.find(t => t.id === id)?.id ?? 'uebersicht'
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => hashToTab(window.location.hash))

  useEffect(() => {
    const fn = () => setActiveTab(hashToTab(window.location.hash))
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])

  function handleTabChange(tabId) { window.location.hash = tabId }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <h1>Hydrologische Resilienz alpiner Schutzhütten</h1>
          <p className="header-subtitle">Neue Prager Hütte · 2796 m · Innergschlöß, Osttirol</p>
        </div>
        <div className="header-right">
          <div className="header-meta"><span>Hohe Tauern</span></div>
          {/* Desktop-only tab nav – rendered inside header */}
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </header>

      {/* OverviewView bleibt immer gemountet – die Map darf nicht zerstört werden */}
      <div className={`tab-view${activeTab === 'uebersicht' ? ' tab-view--active' : ''}`}>
        <OverviewView isActive={activeTab === 'uebersicht'} />
      </div>

      {activeTab === 'daten' && <DataView />}
      {activeTab === 'info'  && <InfoView />}

      {/* Mobile Bottom-Nav – direktes Kind von .dashboard, NICHT im Header,
          damit parent display:none die fixed-Position nicht killt */}
      <nav className="tab-nav tab-nav--mobile" aria-label="Hauptnavigation">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
