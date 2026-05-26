import { useState, useRef, useEffect } from 'react'
import Map from './components/Map'
import HydrologicalChart from './components/HydrologicalChart'
import AnnualTable from './components/AnnualTable'
import { useLanguage } from './i18n/LanguageContext'

const LAYER_DEFS = [
  { key: 'hut',       ids: ['hut'] },
  { key: 'intake',    ids: ['intake'] },
  { key: 'catchment', ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      ids: ['flow-lines'] },
  { key: 'pipeline',  ids: ['pipeline'] },
]

const CATEGORIES = [
  { id: 'combined' },
  { id: 'snow'     },
  { id: 'precip'   },
]

const YEAR_OPTIONS = ['all', 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

function applyMapPadding(map) {
  const mobile = window.innerWidth < 768
  map.setPadding(mobile
    ? { top: 90, left: 16, right: 16, bottom: 40 }
    : { top: 16, left: 16, right: 16, bottom: 40 }
  )
}

export default function App() {
  const { lang, toggleLang, t } = useLanguage()

  const [panelHeight,    setPanelHeight]    = useState(40)
  const [panelMinimized, setPanelMinimized] = useState(false)
  const [sideOpen,       setSideOpen]       = useState(true)
  const [legendOpen,     setLegendOpen]     = useState(() => window.innerWidth >= 768)
  const [aboutOpen,      setAboutOpen]      = useState(false)
  const [infoModalOpen,  setInfoModalOpen]  = useState(false)
  const [layerVisible,   setLayerVisible]   = useState(
    Object.fromEntries(LAYER_DEFS.map(l => [l.key, true]))
  )

  // ── Data-panel state ───────────────────────────────────────
  const [viewMode,           setViewMode]           = useState('chart')
  const [activeCategory,     setActiveCategory]     = useState('combined')
  const [selectedYear,       setSelectedYear]       = useState('all')
  const [activeDataDetail,   setActiveDataDetail]   = useState(null)
  const [temporalResolution, setTemporalResolution] = useState('monthly')

  useEffect(() => { setActiveDataDetail(null) }, [activeCategory, selectedYear, temporalResolution])

  const mapRef          = useRef(null)
  const dataPaneRef     = useRef(null)
  const dragRef         = useRef({ active: false, startY: 0, startHeight: 40, currentHeight: 40 })
  const layerVisibleRef = useRef(layerVisible)
  useEffect(() => { layerVisibleRef.current = layerVisible }, [layerVisible])

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

  // Drive map.resize() for the full CSS-transition duration
  useEffect(() => {
    if (!mapRef.current) return
    const DURATION = 350
    const start = performance.now()
    let raf
    function step(now) {
      mapRef.current?.resize()
      if (now - start < DURATION) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [panelMinimized, sideOpen])

  useEffect(() => {
    function onResize() {
      mapRef.current?.resize()
      if (mapRef.current) applyMapPadding(mapRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Panel drag handlers ───────────────────────────────────
  function handleDragStart(e) {
    if (e.target.closest('.panel-toggle-btn')) return
    // ── Fix #2: disable all map interactions so the map never
    //    receives the touch gesture as a zoom/pan during drag ──
    if (mapRef.current) {
      mapRef.current.dragPan.disable()
      mapRef.current.touchZoomRotate.disable()
      mapRef.current.scrollZoom.disable()
      // Belt-and-suspenders: cut pointer events to the GL canvas
      const canvas = mapRef.current.getCanvas()
      if (canvas) canvas.style.pointerEvents = 'none'
    }
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startHeight: panelHeight,
      currentHeight: panelHeight,
    }
    if (dataPaneRef.current) dataPaneRef.current.style.transition = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleDragMove(e) {
    if (!dragRef.current.active) return
    const dy   = dragRef.current.startY - e.clientY
    const dPct = (dy / window.innerHeight) * 100
    const newH = Math.min(85, Math.max(10, dragRef.current.startHeight + dPct))
    dragRef.current.currentHeight = newH
    if (dataPaneRef.current) dataPaneRef.current.style.height = `${newH}vh`
    mapRef.current?.resize()
  }

  function handleDragEnd() {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    // Re-enable map interactions
    if (mapRef.current) {
      mapRef.current.dragPan.enable()
      mapRef.current.touchZoomRotate.enable()
      mapRef.current.scrollZoom.enable()
      const canvas = mapRef.current.getCanvas()
      if (canvas) canvas.style.pointerEvents = ''
    }
    if (dataPaneRef.current) dataPaneRef.current.style.transition = ''
    setPanelHeight(dragRef.current.currentHeight)
    setPanelMinimized(false)
  }

  function handleMapReady(map) {
    mapRef.current = map
    applyMapPadding(map)
  }

  function toggleLayer(def, checked) {
    setLayerVisible(prev => ({ ...prev, [def.key]: checked }))
    const vis = checked ? 'visible' : 'none'
    def.ids.forEach(id => mapRef.current?.setLayoutProperty(id, 'visibility', vis))
  }

  // ── Mobile year-select change (keeps monthly/individual consistent) ──
  function handleMobileYearChange(e) {
    const y = e.target.value === 'all' ? 'all' : Number(e.target.value)
    setSelectedYear(y)
    if (y === 'all') setTemporalResolution('monthly')
  }

  return (
    <div className="app">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="app-header">

        {/* Left: PoC badge + project title */}
        <div className="header-left">
          <span className="project-badge">PoC</span>
          <h1 className="header-project-title">{t('ui.headerTitle')}</h1>
        </div>

        {/* Center: hut identity */}
        <div className="header-center">
          <span className="hut-name-desktop">{t('ui.hutFull')}</span>
          <span className="hut-name-mobile">{t('ui.hutShort')}</span>
          <span className="hut-elevation">2,796 m</span>
        </div>

        {/* Right: language toggle */}
        <div className="header-right">
          <button
            className="lang-toggle-btn"
            onClick={toggleLang}
            aria-label="Toggle language"
          >
            <span className={lang === 'en' ? 'is-active' : ''}>EN</span>
            {' | '}
            <span className={lang === 'de' ? 'is-active' : ''}>DE</span>
          </button>
        </div>

      </header>

      {/* ── Main Layout ──────────────────────────────────── */}
      <div className="main-layout">

        {/* ── Desktop Sidepanel ────────────────────────── */}
        <aside className={`sidepanel ${sideOpen ? 'open' : 'closed'}`}>
          <div className="sidepanel-header">
            <span className="sidepanel-title">{t('side.title')}</span>
            <button
              className="side-toggle"
              onClick={() => setSideOpen(v => !v)}
              aria-label={sideOpen ? t('side.close') : t('side.open')}
            >
              {sideOpen ? '◀' : '▶'}
            </button>
          </div>

          <div className="sidepanel-content">
            {/* Layer legend */}
            <div className={`layer-legend ${legendOpen ? 'open' : ''}`}>
              <button className="legend-toggle-btn" onClick={() => setLegendOpen(v => !v)}>
                <span>{t('side.layers.heading')}</span>
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
                        {t(`side.layers.${def.key}`)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Fix #1a: About pushed to bottom of sidepanel ── */}
            <div className={`about-accordion sidepanel-about ${aboutOpen ? 'open' : ''}`}>
              <button className="about-toggle" onClick={() => setAboutOpen(v => !v)}>
                <span>{t('side.about.heading')}</span>
                <span>{aboutOpen ? '▴' : '▾'}</span>
              </button>
              {aboutOpen && (
                <div className="about-text">
                  <p>{t('side.about.text')}</p>
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
                <span>{t('side.layers.short')} {legendOpen ? '▴' : '▾'}</span>
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
                        {t(`side.layers.${def.key}`)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Fix #1b: Mobile info button ────────────── */}
            <button
              className="map-info-btn"
              onClick={() => setInfoModalOpen(true)}
              aria-label={t('side.about.heading')}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6.3" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="7" cy="4.4" r="0.9" fill="currentColor"/>
                <path d="M7 6.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Floating tab — visible only when panel is minimised */}
            {panelMinimized && (
              <div className="pane-divider">
                <button
                  className="data-panel-toggle data-panel-toggle--closed"
                  onClick={() => setPanelMinimized(false)}
                  aria-label={t('panel.open')}
                  aria-expanded={false}
                >
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M9 5L5 1 1 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {' '}{t('panel.tab')}
                </button>
              </div>
            )}
          </div>

          {/* DATA PANE */}
          <div
            className={`data-pane${panelMinimized ? ' data-pane--closed' : ''}`}
            style={panelMinimized ? { height: 0 } : { height: `${panelHeight}vh` }}
            ref={dataPaneRef}
          >
            {/* ── Drag Handle ──────────────────────────────── */}
            <div
              className="panel-drag-handle"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <span className="panel-drag-indicator" aria-hidden="true" />
              <button
                className="panel-toggle-btn"
                onClick={() => setPanelMinimized(true)}
                aria-label={t('panel.minimize')}
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* ── Data pane header ─────────────────────────── */}
            <div className="data-pane-header">
              <div className="data-header-row">
                <h2>{t('panel.heading')}</h2>
              </div>

              {/* ── Fix #4: controls restructured ─────────────────── */}
              <div className="data-controls">

                {/* Mobile: compact 2×2 dropdown grid */}
                <div className="data-controls-mobile">
                  <div className="mobile-select-grid">

                    {/* View */}
                    <select
                      className="mobile-select"
                      value={viewMode}
                      onChange={e => {
                        if (e.target.value === 'table' && activeCategory === 'combined') setActiveCategory('snow')
                        setViewMode(e.target.value)
                      }}
                    >
                      <option value="chart">{t('panel.chart')}</option>
                      <option value="table">{t('panel.table')}</option>
                    </select>

                    {/* Category */}
                    <select
                      className="mobile-select"
                      value={activeCategory}
                      onChange={e => setActiveCategory(e.target.value)}
                    >
                      {CATEGORIES
                        .filter(c => viewMode === 'chart' || c.id !== 'combined')
                        .map(c => (
                          <option key={c.id} value={c.id}>{t(`panel.${c.id}`)}</option>
                        ))}
                    </select>

                    {/* Year (chart mode only) */}
                    {viewMode === 'chart' && (
                      <select
                        className="mobile-select"
                        value={String(selectedYear)}
                        onChange={handleMobileYearChange}
                      >
                        {YEAR_OPTIONS
                          .filter(y => !(y === 'all' && temporalResolution === 'individual'))
                          .map(y => (
                            <option key={y} value={String(y)}>
                              {y === 'all' ? t('panel.all') : y}
                            </option>
                          ))}
                      </select>
                    )}

                    {/* Resolution (chart mode only) */}
                    {viewMode === 'chart' && (
                      <select
                        className="mobile-select"
                        value={temporalResolution}
                        onChange={e => setTemporalResolution(e.target.value)}
                      >
                        <option value="monthly">{t('panel.monthly')}</option>
                        {selectedYear !== 'all' && (
                          <option value="individual">{t('panel.individual')}</option>
                        )}
                      </select>
                    )}

                  </div>
                </div>{/* /data-controls-mobile */}

                {/* Desktop: pill/segmented controls (unchanged layout) */}
                <div className="data-controls-desktop">

                  <div className="data-controls-top">
                    <div className="ctrl-seg" role="group" aria-label={t('panel.view_label')}>
                      <button
                        className={`ctrl-seg-btn${viewMode === 'chart' ? ' ctrl-seg-btn--active' : ''}`}
                        aria-pressed={viewMode === 'chart'}
                        onClick={() => setViewMode('chart')}
                      >
                        {t('panel.chart')}
                      </button>
                      <button
                        className={`ctrl-seg-btn${viewMode === 'table' ? ' ctrl-seg-btn--active' : ''}`}
                        aria-pressed={viewMode === 'table'}
                        onClick={() => {
                          if (activeCategory === 'combined') setActiveCategory('snow')
                          setViewMode('table')
                        }}
                      >
                        {t('panel.table')}
                      </button>
                    </div>

                    <div className="ctrl-pills" role="group" aria-label={t('panel.category_label')}>
                      {CATEGORIES.filter(c => viewMode === 'chart' || c.id !== 'combined').map(c => (
                        <button
                          key={c.id}
                          className={`ctrl-pill${activeCategory === c.id ? ' ctrl-pill--active' : ''}`}
                          aria-pressed={activeCategory === c.id}
                          onClick={() => setActiveCategory(c.id)}
                        >
                          {t(`panel.${c.id}`)}
                        </button>
                      ))}
                    </div>

                    {viewMode === 'chart' && (
                      <div className="ctrl-seg ctrl-seg--resolution" role="group" aria-label={t('panel.resolution_label')}>
                        <button
                          className={`ctrl-seg-btn${temporalResolution === 'monthly' ? ' ctrl-seg-btn--active' : ''}`}
                          aria-pressed={temporalResolution === 'monthly'}
                          onClick={() => setTemporalResolution('monthly')}
                          title={t('panel.monthly_title')}
                        >
                          {t('panel.monthly')}
                        </button>
                        {selectedYear !== 'all' && (
                          <button
                            className={`ctrl-seg-btn${temporalResolution === 'individual' ? ' ctrl-seg-btn--active' : ''}`}
                            aria-pressed={temporalResolution === 'individual'}
                            onClick={() => setTemporalResolution('individual')}
                            title={t('panel.individual_title')}
                          >
                            {t('panel.individual')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>{/* /data-controls-top */}

                  {viewMode !== 'table' && (
                    <div className="year-strip" role="group" aria-label={t('panel.year_label')}>
                      {YEAR_OPTIONS
                        .filter(y => !(y === 'all' && temporalResolution === 'individual'))
                        .map(y => (
                          <button
                            key={y}
                            className={`year-pill${selectedYear === y ? ' year-pill--active' : ''}`}
                            aria-pressed={selectedYear === y}
                            onClick={() => setSelectedYear(y)}
                          >
                            {y === 'all' ? t('panel.all') : y}
                          </button>
                        ))}
                    </div>
                  )}

                </div>{/* /data-controls-desktop */}

              </div>{/* /data-controls */}
            </div>{/* /data-pane-header */}

            {/* ── Data pane content ────────────────────────── */}
            <div className="data-pane-inner">
              {viewMode === 'chart' && (
                <div className="data-section">
                  <p className="panel-heading">{t('panel.heading_chart')}</p>
                  <HydrologicalChart
                    activeCategory={activeCategory}
                    selectedYear={selectedYear}
                    activeDataDetail={activeDataDetail}
                    temporalResolution={temporalResolution}
                    onPointClick={setActiveDataDetail}
                  />
                </div>
              )}

              {viewMode === 'table' && (
                <div className="data-section data-section--full">
                  <p className="panel-heading">{t('panel.heading_table')}</p>
                  <div className="annual-table-wrapper">
                    <AnnualTable
                      activeCategory={activeCategory}
                      selectedYear={selectedYear}
                      activeDataDetail={activeDataDetail}
                      onDataDetailChange={setActiveDataDetail}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>{/* /data-pane */}

        </div>
      </div>

      {/* ── Fix #1b: About modal (all viewports, triggered by mobile ℹ button) */}
      {infoModalOpen && (
        <div className="info-modal-backdrop" onClick={() => setInfoModalOpen(false)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <div className="info-modal-header">
              <h3>{t('side.about.heading')}</h3>
              <button
                className="info-modal-close"
                onClick={() => setInfoModalOpen(false)}
                aria-label={t('panel.clear')}
              >
                ✕
              </button>
            </div>
            <p>{t('side.about.text')}</p>
          </div>
        </div>
      )}

    </div>
  )
}
