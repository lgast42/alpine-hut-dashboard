import { useState, useRef, useEffect } from 'react'
import Map from '../components/Map'
import { monthlyAverages } from '../data/hydrologicalData'

const julStats = monthlyAverages.find(m => m.month === 'Jul')

const LAYER_DEFS = [
  { key: 'hut',       label: 'Neue Prager Hütte (2796 m)', ids: ['hut'] },
  { key: 'intake',    label: 'Tankfassung (2740 m)',        ids: ['intake'] },
  { key: 'catchment', label: 'Einzugsgebiet (2,10 ha)',     ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      label: 'Hydrologische Abflussbahnen', ids: ['flow-lines'] },
  { key: 'pipeline',  label: 'Wasserleitung',               ids: ['pipeline'] },
]

function applyMapPadding(map) {
  const mobile = window.innerWidth < 768
  map.setPadding(mobile
    ? { top: 80, left: 16, right: 16, bottom: 60 }
    : { top: 16, left: 16, right: 16, bottom: 16 }
  )
}

export default function OverviewView({ isActive }) {
  const [legendOpen, setLegendOpen] = useState(true)
  const [layerVisible, setLayerVisible] = useState(
    Object.fromEntries(LAYER_DEFS.map(l => [l.key, true]))
  )
  const mapRef = useRef(null)
  const layerVisibleRef = useRef(layerVisible)

  useEffect(() => { layerVisibleRef.current = layerVisible }, [layerVisible])

  // Reapply layer visibility after every style reload
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

  // Resize + re-apply padding when tab becomes visible
  useEffect(() => {
    if (isActive && mapRef.current) {
      mapRef.current.resize()
      applyMapPadding(mapRef.current)
    }
  }, [isActive])

  // Update padding when window is resized (breakpoint change)
  useEffect(() => {
    function onResize() {
      if (mapRef.current) applyMapPadding(mapRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleMapReady(map) {
    mapRef.current = map
    applyMapPadding(map)
  }

  function toggleLayer(def, checked) {
    setLayerVisible(prev => ({ ...prev, [def.key]: checked }))
    const vis = checked ? 'visible' : 'none'
    def.ids.forEach(id => mapRef.current?.setLayoutProperty(id, 'visibility', vis))
  }

  return (
    <div className="overview-wrapper">

      {/* Map column — full area on mobile, left 65% on desktop */}
      <div className="map-column">
        <Map onMapReady={handleMapReady} />

        {/* Layer-Toggle Legende — top-right overlay (both breakpoints) */}
        <aside className={`map-legend${legendOpen ? ' open' : ''}`}>
          <button
            className="legend-toggle"
            onClick={() => setLegendOpen(v => !v)}
            aria-label={legendOpen ? 'Legende schließen' : 'Legende öffnen'}
            title={legendOpen ? 'Legende schließen' : 'Legende öffnen'}
          >
            {legendOpen ? '✕' : '⊞'}
          </button>
          {legendOpen && (
            <div className="legend-content">
              <p className="legend-title">Legende</p>
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
          )}
        </aside>
      </div>

      {/* KPI Sidebar — top-left overlay on mobile, right column on desktop */}
      <aside className="overview-sidebar">
        <div className="kpi-glass-card">
          <div className="kpi-glass-label">Einzugsgebiet</div>
          <div className="kpi-glass-value">2,10 ha</div>
          <div className="kpi-glass-sub">modelliert (DGM 0,5 m)</div>
        </div>
        <div className="kpi-glass-card">
          <div className="kpi-glass-label">Schneebedeckung Median Juli</div>
          <div className="kpi-glass-value">{julStats.snow} %</div>
          <div className="kpi-glass-sub">2018–2025, Sentinel-2</div>
        </div>
        <div className="kpi-glass-card">
          <div className="kpi-glass-label">Niederschlag Mittel Juli</div>
          <div className="kpi-glass-value">{julStats.precipitation} mm</div>
          <div className="kpi-glass-sub">SPARTACUS v2.1</div>
        </div>
      </aside>

    </div>
  )
}
