import { useState, useRef } from 'react'
import './App.css'
import Map from './components/Map'
import HydrologicalChart from './components/HydrologicalChart'
import AnnualTable from './components/AnnualTable'
import ScalingView from './components/ScalingView'

const LAYER_DEFS = [
  { key: 'hut',       label: 'Neue Prager Hütte (2796 m)', ids: ['hut'] },
  { key: 'intake',    label: 'Tankfassung (2740 m)',        ids: ['intake'] },
  { key: 'catchment', label: 'Einzugsgebiet (2,10 ha)',     ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      label: 'Hydrologische Abflussbahnen', ids: ['flow-lines'] },
  { key: 'pipeline',  label: 'Wasserleitung',                ids: ['pipeline'] },
]

function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <section className="about-section">
      <div className="about-inner">
        <button
          className={`about-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          Über dieses Projekt <span className="about-arrow">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="about-content">
            <p>Die Wasserversorgung alpiner Schutzhütten wandelt sich von einem glazial gepufferten zu einem niederschlagsabhängigen System. Dieser Übergang betrifft nicht einzelne Standorte, sondern das alpine Stützpunktnetz insgesamt. Das vorliegende Dashboard demonstriert einen fernerkundungsbasierten Analyse-Workflow, der auf frei verfügbaren Geodaten aufbaut und die hydrologische Resilienz einzelner Hüttenstandorte quantitativ bewertet. Die Pilotanalyse an der Neuen Prager Hütte (2796 m) zeigt, wie Einzugsgebietsmodellierung, Schneebedeckungsanalyse und Niederschlagsdaten zu einem standortspezifischen Versorgungsprofil zusammengeführt werden können. Die Methodik ist auf weitere Standorte übertragbar und soll Alpenvereinen eine objektive Grundlage für die Priorisierung von Infrastrukturinvestitionen liefern.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [layerVisible, setLayerVisible] = useState(
    Object.fromEntries(LAYER_DEFS.map(l => [l.key, true]))
  )
  const mapRef = useRef(null)

  function toggleLayer(def, checked) {
    setLayerVisible(prev => ({ ...prev, [def.key]: checked }))
    const vis = checked ? 'visible' : 'none'
    def.ids.forEach(id => mapRef.current?.setLayoutProperty(id, 'visibility', vis))
  }

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

      <section className="kpi-section">
        <div className="kpi-card">
          <div className="kpi-value">2,10 ha</div>
          <div className="kpi-desc">Modellierte Einzugsgebietsfläche</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Schneebedeckung</div>
          <div className="kpi-value">—</div>
          <div className="kpi-desc">Aktuelle Schneebedeckung im Einzugsgebiet · Daten folgen</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Niederschlag</div>
          <div className="kpi-value">—</div>
          <div className="kpi-desc">Letzter erfasster Monatsniederschlag · Daten folgen</div>
        </div>
      </section>

      <section className="map-section">
        <div className="map-container">
          <Map onMapReady={map => { mapRef.current = map }} />
        </div>
        <aside className={`map-sidebar${sidebarOpen ? ' open' : ' closed'}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label={sidebarOpen ? 'Sidebar schließen' : 'Sidebar öffnen'}
            title={sidebarOpen ? 'Legende schließen' : 'Legende öffnen'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          <div className="sidebar-content">
            <h3>Kartenlegende</h3>
            <ul className="layer-list">
              {LAYER_DEFS.map(def => (
                <li key={def.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={layerVisible[def.key]}
                      onChange={e => toggleLayer(def, e.target.checked)}
                    />
                    <span className={`legend-swatch ${def.key}`} />
                    {def.label}
                  </label>
                </li>
              ))}
            </ul>

          </div>
        </aside>
      </section>

      <section className="analysis-section">
        <div className="chart-panel">
          <h2>Hydrologischer Fingerabdruck</h2>
          <HydrologicalChart />
        </div>
        <div className="table-panel">
          <h2>Datentabelle 2018–2025</h2>
          <AnnualTable />
        </div>
      </section>

      <section className="scaling-section">
        <ScalingView />
      </section>

      <AboutSection />

      <footer className="dashboard-footer">
        <div>
          <h4>Datenquellen</h4>
          <p>Schneebedeckung: Sentinel-2 L2A (ESA/Copernicus)</p>
          <p>Niederschlag: SPARTACUS v2.1 (GeoSphere Austria), 1 km Gitter</p>
          <p>Geländemodell: DGM 0,5 m (Land Tirol / tiris)</p>
        </div>
        <div>
          <h4>Methodik</h4>
          <p>Einzugsgebiet: hydrologische Modellierung</p>
          <p>Validierung: gegen Referenzkartierung geprueft</p>
          <p>Zeitraum: Bewirtschaftungssaison Mai–September, 2018–2025</p>
        </div>
        <div>
          <h4>Ersteller</h4>
          <p>Lucas Gasthauer · B.Sc. Geographie</p>
          <p>Universität Innsbruck · Institut für Geographie</p>
          <p>Kontakt: lucas.gasthauer@student.uibk.ac.at</p>
        </div>
      </footer>
    </div>
  )
}

export default App
