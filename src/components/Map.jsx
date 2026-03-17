import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (TOKEN) mapboxgl.accessToken = TOKEN

const STYLES = [
  { id: 'terrain', label: 'Gelände', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light',   label: 'Hell',    url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'sat',     label: 'Satellit', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
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

  map.addSource('catchment', { type: 'geojson', data: '/data/catchment_polygon.geojson' })
  map.addLayer({ id: 'catchment-fill', type: 'fill', source: 'catchment',
    paint: { 'fill-color': '#3182CE', 'fill-opacity': 0.15 } })
  map.addLayer({ id: 'catchment-outline', type: 'line', source: 'catchment',
    paint: { 'line-color': '#2B6CB0', 'line-width': 2, 'line-dasharray': [4, 2] } })

  map.addSource('flow', { type: 'geojson', data: '/data/flow_lines.geojson' })
  map.addLayer({ id: 'flow-lines', type: 'line', source: 'flow',
    paint: { 'line-color': '#00BCD4', 'line-width': 1.5, 'line-opacity': 0.7 } })

  map.addSource('pipeline', { type: 'geojson', data: '/data/wasserleitung_line.geojson' })
  map.addLayer({ id: 'pipeline', type: 'line', source: 'pipeline',
    paint: { 'line-color': '#2B6CB0', 'line-width': 2.5, 'line-dasharray': [6, 3] } })

  map.addSource('hut', { type: 'geojson', data: '/data/NPH_wgs84.geojson' })
  map.addLayer({ id: 'hut', type: 'circle', source: 'hut',
    paint: { 'circle-radius': 8, 'circle-color': '#E53E3E', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

  map.addSource('intake', { type: 'geojson', data: '/data/tankfassung_nph.geojson' })
  map.addLayer({ id: 'intake', type: 'circle', source: 'intake',
    paint: { 'circle-radius': 7, 'circle-color': '#2B6CB0', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
}

// Called once after initial load – listeners survive style changes
function setupInteractions(map) {
  const ps  = `font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;`
  const pt  = `margin:0 0 4px;font-size:14px;font-weight:600;color:#2D3748;`
  const pb  = `margin:0;color:#718096;`

  map.on('click', 'hut', (e) => {
    const coords = e.features[0].geometry.coordinates.slice()
    new mapboxgl.Popup({ offset: 12 })
      .setLngLat(coords)
      .setHTML(`<div style="${ps}"><p style="${pt}">Neue Prager Hütte</p><p style="${pb}">2796 m ü.A. · DAV-Schutzhütte · Innergschlöß, Osttirol</p></div>`)
      .addTo(map)
  })

  map.on('click', 'intake', (e) => {
    const coords = e.features[0].geometry.coordinates.slice()
    new mapboxgl.Popup({ offset: 12 })
      .setLngLat(coords)
      .setHTML(`<div style="${ps}"><p style="${pt}">Tankfassung / Quellfassung</p><p style="${pb}">2740 m ü.A. · Pour Point des Einzugsgebiets (2,10 ha)</p></div>`)
      .addTo(map)
  })

  map.on('click', 'catchment-fill', (e) => {
    new mapboxgl.Popup({ offset: 4 })
      .setLngLat(e.lngLat)
      .setHTML(`<div style="${ps}"><p style="${pt}">Einzugsgebiet Quellfassung</p><p style="${pb}">Fläche: 2,10 ha · Blockschutt · Modelliert via GRASS GIS (MFD)</p><p style="${pb}">Validierung: Validierung gegen Referenzkartierung</p></div>`)
      .addTo(map)
  })

  ;['hut', 'intake'].forEach(layer => {
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

export default function Map({ onMapReady }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [activeStyle, setActiveStyle] = useState('terrain')

  if (!TOKEN) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDF2F7', color: '#718096', fontSize: 14 }}>
        VITE_MAPBOX_TOKEN fehlt – bitte in .env eintragen
      </div>
    )
  }

  useEffect(() => {
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES[0].url,
      center: [12.3923, 47.1231],
      zoom: 14,
      maxBounds: [[12.34, 47.09], [12.45, 47.16]],
    })

    map.on('style.load', () => setupLayers(map))
    map.on('load', () => setupInteractions(map))

    mapRef.current = map
    onMapReady?.(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  function handleStyleSwitch(style) {
    setActiveStyle(style.id)
    mapRef.current?.setStyle(style.url)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1,
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
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
