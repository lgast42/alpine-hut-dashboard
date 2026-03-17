import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (TOKEN) mapboxgl.accessToken = TOKEN

export default function Map() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

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
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [12.3923, 47.1231],
      zoom: 14,
      maxBounds: [[12.34, 47.09], [12.45, 47.16]],
    })

    map.on('load', () => {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 })

      // 1. Einzugsgebiet – Füllung
      map.addSource('catchment', { type: 'geojson', data: '/data/catchment_polygon.geojson' })
      map.addLayer({ id: 'catchment-fill', type: 'fill', source: 'catchment',
        paint: { 'fill-color': '#3182CE', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'catchment-outline', type: 'line', source: 'catchment',
        paint: { 'line-color': '#2B6CB0', 'line-width': 2, 'line-dasharray': [4, 2] } })

      // 2. Fließlinien
      map.addSource('flow', { type: 'geojson', data: '/data/flow_lines.geojson' })
      map.addLayer({ id: 'flow-lines', type: 'line', source: 'flow',
        paint: { 'line-color': '#00BCD4', 'line-width': 1.5, 'line-opacity': 0.7 } })

      // 3. Wasserleitung
      map.addSource('pipeline', { type: 'geojson', data: '/data/wasserleitung_line.geojson' })
      map.addLayer({ id: 'pipeline', type: 'line', source: 'pipeline',
        paint: { 'line-color': '#2B6CB0', 'line-width': 2.5, 'line-dasharray': [6, 3] } })

      // 4. Hütte
      map.addSource('hut', { type: 'geojson', data: '/data/NPH_wgs84.geojson' })
      map.addLayer({ id: 'hut', type: 'circle', source: 'hut',
        paint: { 'circle-radius': 8, 'circle-color': '#E53E3E', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

      // 5. Tankfassung
      map.addSource('intake', { type: 'geojson', data: '/data/tankfassung_nph.geojson' })
      map.addLayer({ id: 'intake', type: 'circle', source: 'intake',
        paint: { 'circle-radius': 7, 'circle-color': '#2B6CB0', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
