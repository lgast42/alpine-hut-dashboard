import { useState, useRef, useEffect } from 'react'
import Map from './components/Map'
import HydrologicalChart from './components/HydrologicalChart'
import SnowTimeSeriesChart from './components/SnowTimeSeriesChart'
import AnnualTable from './components/AnnualTable'

const LAYER_DEFS = [
  { key: 'hut',       label: 'Neue Prager Hütte', ids: ['hut'] },
  { key: 'intake',    label: 'Tankfassung',        ids: ['intake'] },
  { key: 'catchment', label: 'Einzugsgebiet',      ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      label: 'Abflussbahnen',      ids: ['flow-lines'] },
  { key: 'pipeline',  label: 'Wasserleitung',      ids: ['pipeline'] },
]

function applyMapPadding(map) {
  const mobile = window.innerWidth < 768
  map.setPadding(mobile
    ? { top: 90, left: 16, right: 16, bottom: 40 }
    : { top: 16, left: 16, right: 16, bottom: 40 }
  )
}

export default function App() {
  const [mapExpanded,  setMapExpanded]  = useState(false)
  const [dataExpanded, setDataExpanded] = useState(false)
  const [sideOpen,     setSideOpen]     = useState(true)
  const [legendOpen,   setLegendOpen]   = useState(true)
  const [aboutOpen,    setAboutOpen]    = useState(false)
  const [layerVisible, setLayerVisible] = useState(
    Object.fromEntries(LAYER_DEFS.map(l => [l.key, true]))
  )

  const mapRef          = useRef(null)
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

  // Resize map after panel transitions complete
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 320)
    return () => clearTimeout(t)
  }, [mapExpanded, dataExpanded, sideOpen])

  // Resize + re-pad on window resize
  useEffect(() => {
    function onResize() {
      mapRef.current?.resize()
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

  function toggleMapExpand() {
    setMapExpanded(v => !v)
    setDataExpanded(false)
  }

  function toggleDataExpand() {
    setDataExpanded(v => !v)
    setMapExpanded(false)
  }

  const layoutClass = mapExpanded ? 'layout--map' : dataExpanded ? 'layout--data' : ''

  return (
    <div className="app">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-title">
            <h1>Hydrologische Resilienz alpiner Schutzhütten</h1>
            <p className="header-subtitle">Neue Prager Hütte · 2796 m · Innergschlöß, Osttirol</p>
          </div>
        </div>
        <span className="header-badge">Hohe Tauern</span>
      </header>

      {/* ── Main Layout ──────────────────────────────────── */}
      <div className={`main-layout ${layoutClass}`}>

        {/* ── Desktop Sidepanel ────────────────────────── */}
        <aside className={`sidepanel ${sideOpen ? 'open' : 'closed'}`}>
          <div className="sidepanel-header">
            <span className="sidepanel-title">Analyse</span>
            <button
              className="side-toggle"
              onClick={() => setSideOpen(v => !v)}
              aria-label={sideOpen ? 'Sidepanel schließen' : 'Sidepanel öffnen'}
            >
              {sideOpen ? '◀' : '▶'}
            </button>
          </div>

          <div className="sidepanel-content">
            <div className={`layer-legend ${legendOpen ? 'open' : ''}`}>
              <button className="legend-toggle-btn" onClick={() => setLegendOpen(v => !v)}>
                <span>Kartenebenen</span>
                <span>{legendOpen ? '▴' : '▾'}</span>
              </button>
              {legendOpen && (
                <ul className="legend-list">
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
              )}
            </div>

            <div className={`about-accordion ${aboutOpen ? 'open' : ''}`}>
              <button className="about-toggle" onClick={() => setAboutOpen(v => !v)}>
                <span>Über das Projekt</span>
                <span>{aboutOpen ? '▴' : '▾'}</span>
              </button>
              {aboutOpen && (
                <div className="about-text">
                  <p>Pilotanalyse der hydrologischen Resilienz der Neuen Prager Hütte (2796 m, Innergschlöß, Osttirol). Einzugsgebiet modelliert via hydrologische Modellierung (MFD). Schneebedeckung aus Sentinel-2 NDSI (&gt; 0,4). Niederschlag aus SPARTACUS v2.1 (GeoSphere Austria). Der hydrologische Übergang von nival-dominiert zu stochastisch-pluvial ist für Aug/Sep besonders ausgeprägt.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Content Column ───────────────────────────── */}
        <div className="content-col">

          {/* MAP PANE */}
          <div className="map-pane">
            <Map onMapReady={handleMapReady} />

            {/* Mobile: Layer legend overlay (top-right) */}
            <div className={`map-legend-overlay ${legendOpen ? 'open' : ''}`}>
              <button className="legend-toggle-btn" onClick={() => setLegendOpen(v => !v)}>
                <span>Ebenen {legendOpen ? '▴' : '▾'}</span>
              </button>
              {legendOpen && (
                <ul className="legend-list">
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
              )}
            </div>

            {/* Pane controls — bottom of map */}
            <div className="pane-divider">
              <button className="pane-btn" onClick={toggleMapExpand}>
                {mapExpanded ? '↕ Teilen' : '↑ Karte maximieren'}
              </button>
              {!mapExpanded && (
                <button className="pane-btn" onClick={toggleDataExpand}>
                  {dataExpanded ? '↕ Teilen' : '↓ Daten maximieren'}
                </button>
              )}
            </div>
          </div>

          {/* DATA PANE */}
          <div className="data-pane">
            <div className="data-pane-header">
              <h2>Hydrologische Analyse · 2018–2025</h2>
              <button className="data-expand-btn" onClick={toggleDataExpand}>
                {dataExpanded ? '↕ Teilen' : '↑ Maximieren'}
              </button>
            </div>
            <div className="data-pane-inner">
              <div className="data-section">
                <p className="panel-heading">Hydrologischer Fingerabdruck</p>
                <HydrologicalChart />
              </div>
              <div className="data-section">
                <p className="panel-heading">Sentinel-2 Einzelszenen · 2018–2025</p>
                <SnowTimeSeriesChart />
              </div>
              <div className="data-section">
                <p className="panel-heading">Datentabelle 2018–2025</p>
                <div className="annual-table-wrapper">
                  <AnnualTable />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
