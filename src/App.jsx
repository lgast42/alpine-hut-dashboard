import { useState, useRef } from 'react'
import './App.css'
import Map from './components/Map'
import HydrologicalChart from './components/HydrologicalChart'
import AnnualTable from './components/AnnualTable'

const LAYER_DEFS = [
  { key: 'catchment', label: 'Einzugsgebiet',    ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      label: 'Abflussbahnen',     ids: ['flow-lines'] },
  { key: 'pipeline',  label: 'Wasserleitung',      ids: ['pipeline'] },
  { key: 'hut',       label: 'Neue Prager Hütte', ids: ['hut'] },
  { key: 'intake',    label: 'Tankfassung',        ids: ['intake'] },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
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

      <section className="map-section">
        <div className={`map-container${sidebarOpen ? '' : ' sidebar-closed'}`}>
          <Map onMapReady={map => { mapRef.current = map }} />
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
            <h3>Kartenlegende</h3>
            <ul className="legend-list">
              <li>
                <span className="legend-swatch hut" />
                Neue Prager Hütte (2796 m)
              </li>
              <li>
                <span className="legend-swatch intake" />
                Tankfassung (2740 m)
              </li>
              <li>
                <span className="legend-swatch catchment" />
                Einzugsgebiet (2,10 ha)
              </li>
              <li>
                <span className="legend-swatch flow" />
                Hydrologische Abflussbahnen
              </li>
              <li>
                <span className="legend-swatch pipeline" />
                Wasserleitung
              </li>
            </ul>

            <h3>Layer ein-/ausblenden</h3>
            <ul className="layer-list">
              {LAYER_DEFS.map(def => (
                <li key={def.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={layerVisible[def.key]}
                      onChange={e => toggleLayer(def, e.target.checked)}
                    />
                    {def.label}
                  </label>
                </li>
              ))}
            </ul>

            <hr className="sidebar-divider" />

            <dl className="site-info">
              <dt>Höhenbereich</dt>
              <dd>2740–2900 m</dd>
              <dt>Substrat</dt>
              <dd>Blockschutt (periglazial)</dd>
              <dt>Ehemaliger Gletscher</dt>
              <dd>Schlatenkees (&gt;1,5 km entfernt)</dd>
            </dl>
          </div>
        </aside>
      </section>

      <section className="analysis-section">
        <div className="chart-panel">
          <h2>Hydrologischer Fingerabdruck</h2>
          <HydrologicalChart />
        </div>
        <div className="table-panel">
          <h2>Jahresvergleich 2018–2025</h2>
          <AnnualTable />
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
