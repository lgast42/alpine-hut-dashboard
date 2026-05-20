import { TABS } from '../App'

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <nav className="tab-nav tab-nav--desktop" aria-label="Hauptnavigation">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
