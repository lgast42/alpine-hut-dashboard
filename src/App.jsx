import { useState, useRef, useEffect } from 'react'
import Map from './components/Map'
import HydrologicalChart from './components/HydrologicalChart'
import AnnualTable from './components/AnnualTable'
import AboutSection from './components/AboutSection'
import SpringFlowPanel from './components/SpringFlowPanel'
import SiteProfilePanel from './components/SiteProfilePanel'
import MeltoutPanel from './components/MeltoutPanel'
import { useLanguage } from './i18n/LanguageContext'
import { dataYears, manifest, isRunningSeason } from './lib/dataset'
import { SITES, getSite, DEFAULT_SITE_ID } from './sites/sites'

const LAYER_DEFS = [
  { key: 'hut',       ids: ['hut'] },
  { key: 'intake',    ids: ['intake'] },
  { key: 'catchment', ids: ['catchment-fill', 'catchment-outline'] },
  { key: 'flow',      ids: ['flow-lines'] },
  { key: 'pipeline',  ids: ['pipeline'] },
]

// 'meltout' is the long-term category (own panel, no year navigation).
// 'spring' is a placeholder category without data (publication pending).
const CATEGORIES = [
  { id: 'combined' },
  { id: 'snow'     },
  { id: 'precip'   },
  { id: 'meltout'  },
  { id: 'spring'   },
]

const TABLE_EXCLUDED = new Set(['combined', 'meltout', 'spring'])

// Categories that bring their own panel: no year strip, no resolution switch.
const PANEL_CATEGORIES = new Set(['meltout', 'spring'])

// Years come from the export; a new season appears with the next export.
const YEAR_OPTIONS = ['all', ...dataYears]

function applyMapPadding(map) {
  const mobile = window.innerWidth < 768
  map.setPadding(mobile
    ? { top: 90, left: 16, right: 16, bottom: 40 }
    : { top: 16, left: 16, right: 16, bottom: 40 }
  )
}

export default function App() {
  const { lang, toggleLang, t } = useLanguage()

  // Visible data status from the export manifest (Handoff §3.7).
  const dataThroughLabel = new Intl.DateTimeFormat(
    lang === 'de' ? 'de-AT' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' }
  ).format(new Date(manifest.data_through))
  const hasRunningSeason = dataYears.some(isRunningSeason)

  const [activeSiteId,   setActiveSiteId]   = useState(DEFAULT_SITE_ID)
  const activeSite = getSite(activeSiteId)
  const siteHasData = activeSite.status === 'full'

  const [panelHeight,    setPanelHeight]    = useState(40)
  const [panelMinimized, setPanelMinimized] = useState(false)
  const [sideOpen,       setSideOpen]       = useState(true)
  const [legendOpen,     setLegendOpen]     = useState(() => window.innerWidth >= 768)
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

  // A change of category, year or resolution invalidates the detail popup.
  // Cleared in the event handlers below (not in an effect) so the reset
  // happens in the same render as the change itself.
  function selectCategory(c) { setActiveCategory(c); setActiveDataDetail(null) }
  function selectYear(y)     { setSelectedYear(y);   setActiveDataDetail(null) }
  function selectResolution(r) { setTemporalResolution(r); setActiveDataDetail(null) }

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
          // A layer may not exist in the currently loaded style.
          try { map.setLayoutProperty(id, 'visibility', vis) } catch { /* ignore */ }
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
    selectYear(y)
    if (y === 'all') setTemporalResolution('monthly')
  }

  return (
    <div className="app">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="app-header">

        {/* Left: product name + prototype badge */}
        <div className="header-left">
          <h1 className="header-product-name">
            <span className="product-name-full">{t('header.productName')}</span>
            <span className="product-name-short">{t('header.productNameShort')}</span>
          </h1>
          <span className="prototype-badge">{t('header.badge')}</span>
        </div>

        {/* Center: site switcher — hidden below 480 px */}
        <div className="header-center">
          <select
            className="site-select"
            value={activeSiteId}
            onChange={e => setActiveSiteId(e.target.value)}
            aria-label={t('sites.switch_label')}
          >
            {SITES.map(s => (
              <option key={s.id} value={s.id} disabled={s.status === 'planned'}>
                {s.status === 'planned' ? t('sites.planned') : t(`sites.${s.id}.short`)}
              </option>
            ))}
          </select>
        </div>

        {/* Right: language toggle (unchanged) */}
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
            {/* Layer legend — NPH layers, only shown for that site */}
            {activeSite.hasLayerLegend && (
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
            )}

            {/* ── About: bottom of sidepanel (desktop only) ── */}
            <div className="sidepanel-about">
              <AboutSection />
            </div>
          </div>
        </aside>

        {/* ── Content Column ───────────────────────────── */}
        <div className="content-col">

          {/* MAP PANE */}
          <div className="map-pane">
            <Map onMapReady={handleMapReady} site={activeSite} />

            {/* Mobile: Layer legend overlay (top-right) */}
            {activeSite.hasLayerLegend && (
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
            )}

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

            {/* ── Data pane header (controls only exist for data sites) ── */}
            {siteHasData && (
            <div className="data-pane-header">
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
                        if (e.target.value === 'table' && TABLE_EXCLUDED.has(activeCategory)) selectCategory('snow')
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
                      onChange={e => selectCategory(e.target.value)}
                    >
                      {CATEGORIES
                        .filter(c => viewMode === 'chart' || !TABLE_EXCLUDED.has(c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{t(`panel.${c.id}`)}</option>
                        ))}
                    </select>

                    {/* Year (chart mode only, not for own-panel categories) */}
                    {viewMode === 'chart' && !PANEL_CATEGORIES.has(activeCategory) && (
                      <select
                        className="mobile-select"
                        value={String(selectedYear)}
                        onChange={handleMobileYearChange}
                      >
                        {YEAR_OPTIONS
                          .filter(y => !(y === 'all' && temporalResolution === 'individual'))
                          .map(y => (
                            <option key={y} value={String(y)}>
                              {y === 'all' ? t('panel.all')
                                : isRunningSeason(y) ? `${y} (${t('panel.running')})`
                                : y}
                            </option>
                          ))}
                      </select>
                    )}

                    {/* Resolution (chart mode only, not for own-panel categories) */}
                    {viewMode === 'chart' && !PANEL_CATEGORIES.has(activeCategory) && (
                      <select
                        className="mobile-select"
                        value={temporalResolution}
                        onChange={e => selectResolution(e.target.value)}
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
                          if (TABLE_EXCLUDED.has(activeCategory)) selectCategory('snow')
                          setViewMode('table')
                        }}
                      >
                        {t('panel.table')}
                      </button>
                    </div>

                    <div className="ctrl-pills" role="group" aria-label={t('panel.category_label')}>
                      {CATEGORIES.filter(c => viewMode === 'chart' || !TABLE_EXCLUDED.has(c.id)).map(c => (
                        <button
                          key={c.id}
                          className={`ctrl-pill${activeCategory === c.id ? ' ctrl-pill--active' : ''}`}
                          aria-pressed={activeCategory === c.id}
                          onClick={() => selectCategory(c.id)}
                        >
                          {t(`panel.${c.id}`)}
                        </button>
                      ))}
                    </div>

                    {viewMode === 'chart' && !PANEL_CATEGORIES.has(activeCategory) && (
                      <div className="ctrl-seg ctrl-seg--resolution" role="group" aria-label={t('panel.resolution_label')}>
                        <button
                          className={`ctrl-seg-btn${temporalResolution === 'monthly' ? ' ctrl-seg-btn--active' : ''}`}
                          aria-pressed={temporalResolution === 'monthly'}
                          onClick={() => selectResolution('monthly')}
                          title={t('panel.monthly_title')}
                        >
                          {t('panel.monthly')}
                        </button>
                        {selectedYear !== 'all' && (
                          <button
                            className={`ctrl-seg-btn${temporalResolution === 'individual' ? ' ctrl-seg-btn--active' : ''}`}
                            aria-pressed={temporalResolution === 'individual'}
                            onClick={() => selectResolution('individual')}
                            title={t('panel.individual_title')}
                          >
                            {t('panel.individual')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>{/* /data-controls-top */}

                  {viewMode !== 'table' && !PANEL_CATEGORIES.has(activeCategory) && (
                    <div className="year-strip" role="group" aria-label={t('panel.year_label')}>
                      {YEAR_OPTIONS
                        .filter(y => !(y === 'all' && temporalResolution === 'individual'))
                        .map(y => (
                          <button
                            key={y}
                            className={`year-pill${selectedYear === y ? ' year-pill--active' : ''}`}
                            aria-pressed={selectedYear === y}
                            onClick={() => selectYear(y)}
                            title={isRunningSeason(y) ? t('panel.running_title') : undefined}
                            aria-label={isRunningSeason(y) ? `${y} – ${t('panel.running_title')}` : undefined}
                          >
                            {y === 'all' ? t('panel.all') : isRunningSeason(y) ? `${y}*` : y}
                          </button>
                        ))}
                    </div>
                  )}

                </div>{/* /data-controls-desktop */}

              </div>{/* /data-controls */}

              {/* Data status from the export manifest */}
              <div className="data-stamp">
                {t('panel.data_through')}: {dataThroughLabel}
                {hasRunningSeason && ` · * ${t('panel.running_title')}`}
              </div>
            </div>
            )}{/* /data-pane-header */}

            {/* ── Data pane content ────────────────────────── */}
            <div className="data-pane-inner">
              {!siteHasData && (
                <div className="data-section">
                  <SiteProfilePanel />
                </div>
              )}

              {siteHasData && viewMode === 'chart' && activeCategory === 'meltout' && (
                <div className="data-section">
                  <MeltoutPanel />
                </div>
              )}

              {siteHasData && viewMode === 'chart' && activeCategory === 'spring' && (
                <div className="data-section">
                  <SpringFlowPanel />
                </div>
              )}

              {siteHasData && viewMode === 'chart' && !PANEL_CATEGORIES.has(activeCategory) && (
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

              {siteHasData && viewMode === 'table' && (
                <div className="data-section data-section--full">
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

              {/* ── About: mobile-only, inside scrollable data panel ── */}
              <div className="about-in-datapanel">
                <AboutSection />
              </div>
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
            <p>{t('side.about.paragraph1')}</p>
            <p>{t('side.about.paragraph2')}</p>
            <p className="about-footer">{t('side.about.footer')}</p>
          </div>
        </div>
      )}

    </div>
  )
}
