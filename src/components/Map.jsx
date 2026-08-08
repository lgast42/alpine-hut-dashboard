import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useLanguage } from '../i18n/LanguageContext'
import { SITES, getSite } from '../sites/sites'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (TOKEN) mapboxgl.accessToken = TOKEN

const STYLES = [
  { id: 'terrain', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light',   url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'sat',     url: 'mapbox://styles/mapbox/satellite-streets-v12' },
]

// Called on every style.load (initial + after setStyle)
function setupLayers(map) {
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    maxzoom: 14,
  })
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 })

  map.addSource('catchment', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/catchment_polygon.geojson` })
  map.addLayer({ id: 'catchment-fill', type: 'fill', source: 'catchment',
    paint: { 'fill-color': '#3182CE', 'fill-opacity': 0.15 } })
  map.addLayer({ id: 'catchment-outline', type: 'line', source: 'catchment',
    paint: { 'line-color': '#2B6CB0', 'line-width': 2, 'line-dasharray': [4, 2] } })

  map.addSource('flow', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/flow_lines.geojson` })
  map.addLayer({ id: 'flow-lines', type: 'line', source: 'flow',
    paint: { 'line-color': '#00BCD4', 'line-width': 1.5, 'line-opacity': 0.7 } })

  map.addSource('pipeline', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/wasserleitung_line.geojson` })
  map.addLayer({ id: 'pipeline', type: 'line', source: 'pipeline',
    paint: { 'line-color': '#2B6CB0', 'line-width': 2.5, 'line-dasharray': [6, 3] } })

  map.addSource('hut', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/NPH_wgs84.geojson` })
  map.addLayer({ id: 'hut', type: 'circle', source: 'hut',
    paint: { 'circle-radius': 8, 'circle-color': '#E53E3E', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

  map.addSource('intake', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/tankfassung_nph.geojson` })
  map.addLayer({ id: 'intake', type: 'circle', source: 'intake',
    paint: { 'circle-radius': 7, 'circle-color': '#2B6CB0', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

  // Markers for profile-only sites (currently the Richterhütte): amber to
  // signal "analysis in preparation", as opposed to the red full-data hut.
  SITES.filter(s => s.marker).forEach(site => {
    map.addSource(`site-${site.id}`, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: site.center } },
    })
    map.addLayer({ id: `site-${site.id}`, type: 'circle', source: `site-${site.id}`,
      paint: { 'circle-radius': 8, 'circle-color': '#F59E0B', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
  })
}

// ── Popup HTML builder ─────────────────────────────────────────
// Builds a styled Mapbox popup with a bold title, a thin divider,
// and one <p> per fact line. Pure function — no React, no DOM side-effects.
function popupHTML(t, titleKey, lineKeys) {
  const sWrap  = `font-family:'Inter',sans-serif;font-size:13px;line-height:1.6;min-width:200px;max-width:260px;`
  const sTitle = `margin:0 0 6px;font-size:14px;font-weight:600;color:#2D3748;`
  const sSep   = `margin:0 0 6px;border:none;border-top:1px solid #E2E8F0;`
  const sLine  = `margin:2px 0 0;color:#718096;`
  const rows   = lineKeys.map(k => `<p style="${sLine}">${t(k)}</p>`).join('')
  return `<div style="${sWrap}"><p style="${sTitle}">${t(titleKey)}</p><hr style="${sSep}">${rows}</div>`
}

// Called once after initial load – listeners survive style changes.
// tRef holds the current translation function; reading tRef.current inside
// each click handler ensures popups always use the active language.
function setupInteractions(map, tRef) {
  map.on('click', 'hut', (e) => {
    const t = tRef.current
    new mapboxgl.Popup({ offset: 12 })
      .setLngLat(e.features[0].geometry.coordinates.slice())
      .setHTML(popupHTML(t, 'map.popup.hut.title', [
        'map.popup.hut.line1',
        'map.popup.hut.line2',
        'map.popup.hut.line3',
        'map.popup.hut.line4',
        'map.popup.hut.line5',
      ]))
      .addTo(map)
  })

  map.on('click', 'intake', (e) => {
    const t = tRef.current
    new mapboxgl.Popup({ offset: 12 })
      .setLngLat(e.features[0].geometry.coordinates.slice())
      .setHTML(popupHTML(t, 'map.popup.spring.title', [
        'map.popup.spring.line1',
        'map.popup.spring.line2',
      ]))
      .addTo(map)
  })

  map.on('click', 'catchment-fill', (e) => {
    const t = tRef.current
    new mapboxgl.Popup({ offset: 4 })
      .setLngLat(e.lngLat)
      .setHTML(popupHTML(t, 'map.popup.catchment.title', [
        'map.popup.catchment.line1',
        'map.popup.catchment.line2',
        'map.popup.catchment.line3',
        'map.popup.catchment.line4',
        'map.popup.catchment.line5',
      ]))
      .addTo(map)
  })

  SITES.filter(s => s.marker).forEach(site => {
    map.on('click', `site-${site.id}`, (e) => {
      const t = tRef.current
      new mapboxgl.Popup({ offset: 12 })
        .setLngLat(e.features[0].geometry.coordinates.slice())
        .setHTML(popupHTML(t, `map.popup.${site.id}.title`, [
          `map.popup.${site.id}.line1`,
          `map.popup.${site.id}.line2`,
        ]))
        .addTo(map)
    })
  })

  ;['hut', 'intake', ...SITES.filter(s => s.marker).map(s => `site-${s.id}`)].forEach(layer => {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
  })

  map.on('mouseenter', 'catchment-fill', () => {
    map.getCanvas().style.cursor = 'pointer'
    map.setPaintProperty('catchment-fill', 'fill-opacity', 0.3)
  })
  map.on('mouseleave', 'catchment-fill', () => {
    map.getCanvas().style.cursor = ''
    map.setPaintProperty('catchment-fill', 'fill-opacity', 0.15)
  })
}

export default function Map({ onMapReady, site = getSite('nph') }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [activeStyle, setActiveStyle] = useState('terrain')
  const { t } = useLanguage()

  // Keep a ref so popup click handlers always read the current language
  // without needing to re-register listeners on every language switch.
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])

  // Site currently framed by the camera (init below, updated on switch).
  const framedSiteRef = useRef(null)

  useEffect(() => {
    if (!TOKEN) return
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES[0].url,
      center: site.center,
      zoom: site.zoom,
      maxBounds: site.maxBounds,
    })
    framedSiteRef.current = site

    map.on('style.load', () => setupLayers(map))
    map.on('load', () => setupInteractions(map, tRef))

    mapRef.current = map
    onMapReady?.(map)
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once; site changes are handled by the fly-to effect
  }, [])

  // Fly to the newly selected site. Bounds are released before the flight
  // (the target may lie outside the previous site's bounds) and re-applied
  // once the camera has arrived.
  useEffect(() => {
    const map = mapRef.current
    if (!map || framedSiteRef.current?.id === site.id) return
    framedSiteRef.current = site
    map.setMaxBounds(null)
    map.flyTo({ center: site.center, zoom: site.zoom, pitch: 0, bearing: 0, duration: 2400, essential: true })
    map.once('moveend', () => {
      if (framedSiteRef.current?.id === site.id && site.maxBounds) {
        map.setMaxBounds(site.maxBounds)
      }
    })
  }, [site])

  function handleStyleSwitch(style) {
    setActiveStyle(style.id)
    mapRef.current?.setStyle(style.url)
  }

  function handleHome() {
    mapRef.current?.flyTo({ center: site.center, zoom: site.zoom, pitch: 0, bearing: 0, duration: 1500 })
  }

  // Placed after all hooks so the hook order stays identical on every render.
  if (!TOKEN) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDF2F7', color: '#718096', fontSize: 14 }}>
        {t('map.no_token')}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <button
        onClick={handleHome}
        title={t('map.home_title')}
        aria-label={t('map.home_aria')}
        style={{
          position: 'absolute', bottom: 110, right: 10, zIndex: 1,
          width: 30, height: 30,
          background: '#fff',
          border: 'none',
          borderRadius: 4,
          boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        🏠
      </button>
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 1,
        display: 'flex', gap: 4,
      }}>
        {STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => handleStyleSwitch(s)}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              borderRadius: 999,
              border: '1px solid #CBD5E0',
              cursor: 'pointer',
              background: activeStyle === s.id ? '#2B6CB0' : '#ffffff',
              color: activeStyle === s.id ? '#ffffff' : '#2D3748',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t(`map.${s.id}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
