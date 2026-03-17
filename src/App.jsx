import { useState } from 'react'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <h1>Hydrologische Resilienz alpiner Schutzhütten</h1>
          <p className="header-subtitle">Neue Prager Hütte · 2796 m · Innergschlöß, Osttirol</p>
        </div>
        <div className="header-meta">
          <span>Hohe Tauern</span>
        </div>
      </header>

      <section className="map-section">
        <div className={`map-container${sidebarOpen ? '' : ' sidebar-closed'}`}>
          <div className="map-placeholder">Karte wird geladen…</div>
        </div>
        <aside className={`map-sidebar${sidebarOpen ? ' open' : ' closed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label={sidebarOpen ? 'Sidebar schließen' : 'Sidebar öffnen'}
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
          <div className="sidebar-content">
            <h3>Legende</h3>
            <ul className="legend-list">
              <li><span className="legend-swatch catchment"></span>Einzugsgebiet (2,10 ha)</li>
              <li><span className="legend-swatch flow"></span>Fließlinien</li>
              <li><span className="legend-swatch pipeline"></span>Wasserleitung</li>
              <li><span className="legend-swatch hut"></span>Neue Prager Hütte</li>
              <li><span className="legend-swatch intake"></span>Tankfassung</li>
            </ul>
            <h3>Layer-Steuerung</h3>
            <ul className="layer-list">
              <li><label><input type="checkbox" defaultChecked /> Einzugsgebiet</label></li>
              <li><label><input type="checkbox" defaultChecked /> Fließlinien</label></li>
              <li><label><input type="checkbox" defaultChecked /> Wasserleitung</label></li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="analysis-section">
        <div className="chart-panel">
          <h2>Hydrologischer Fingerabdruck</h2>
          <div className="chart-placeholder">Diagramm wird geladen…</div>
        </div>
        <div className="table-panel">
          <h2>Jahresvergleich 2018–2025</h2>
          <div className="table-placeholder">Tabelle wird geladen…</div>
        </div>
      </section>

      <footer className="dashboard-footer">
        <div>
          <h4>Datenquellen</h4>
          <p>Niederschlag: SPARTACUS v2.1 (GeoSphere Austria)</p>
          <p>Schneebedeckung: Sentinel-2 NDSI (&gt; 0,4)</p>
        </div>
        <div>
          <h4>Methodik</h4>
          <p>Einzugsgebiet modelliert via hydrologische Modellierung MFD</p>
          <p>Koordinatensystem: EPSG:4326 (WGS 84)</p>
        </div>
        <div>
          <h4>Projekt</h4>
          <p>Hydrologische Resilienz alpiner Schutzhütten</p>
          <p>Saisonzeitraum: Mai–September 2018–2025</p>
        </div>
      </footer>
    </div>
  )
}

export default App
