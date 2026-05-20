import { useState, useRef, useEffect } from 'react'
import Map from '../components/Map'

const LAYER_DEFS = [
  { key: 'hut',       label: 'Neue Prager Hütte (2796 m)', ids: ['hut'] },
  { key: 'intake',    label: 'Tankfassung (2740 m)',        ids: ['intake'] },
  { key: 'catchment', label: 'Einzugsgebiet (2,10 ha)',     ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      label: 'Hydrologische Abflussbahnen', ids: ['flow-lines'] },
  { key: 'pipeline',  label: 'Wasserleitung',               ids: ['pipeline'] },
]

export default function OverviewView({ isActive }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [layerVisible, setLayerVisible] = useState(
    Object.fromEntries(LAYER_DEFS.map(l => [l.key, true]))
  )
  const mapRef = useRef(null)
  const layerVisibleRef = useRef(layerVisible)

  useEffect(() => { layerVisibleRef.current = layerVisible }, [layerVisible])

  // Reapply layer visibility after any map style reload
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    function reapply() {
      LAYER_DEFS.forEach(def => {
        const vis = layerVisibleRef.current[def.key] ? 'visible' : 'none'
        def.ids.forEach(id => {
          try { map.setLayoutProperty(id, 'visibility', vis) } catch (_) {}
        })
      })
    }
    map.on('style.load', reapply)
    return () => map.off('style.load', reapply)
  }, [])

  // Resize map when tab becomes active (was hidden via display:none)
  useEffect(() => {
    if (isActive && mapRef.current) {
      mapRef.current.resize()
    }
  }, [isActive])

  function toggleLayer(def, checked) {
    setLayerVisible(prev => ({ ...prev, [def.key]: checked }))
    const vis = checked ? 'visible' : 'none'
    def.ids.forEach(id => mapRef.current?.setLayoutProperty(id, 'visibility', vis))
  }

  return (
    <>
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
    </>
  )
}
