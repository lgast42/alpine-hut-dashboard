// Site registry for the location switcher.
//
// Hand-written frontend content (names, coordinates, map framing) — kept
// deliberately outside src/data/, which is reserved for generated pipeline
// exports. Adding a site here does not give it data; time series only exist
// once the pipeline exports them for that site.
//
// status:
//   'full'    — complete dashboard (data panel, map layers)
//   'profile' — map marker + fact sheet, no time series yet
//   'planned' — greyed-out placeholder in the switcher
//
// Richterhütte coordinates: OpenStreetMap way 25439465 (alpine_hut).

export const SITES = [
  {
    id: 'nph',
    status: 'full',
    center: [12.3923, 47.1231],
    zoom: 14,
    maxBounds: [[12.34, 47.09], [12.45, 47.16]],
    hasLayerLegend: true,
    marker: false,
  },
  {
    id: 'richterhuette',
    status: 'profile',
    center: [12.1340, 47.1242],
    zoom: 13.4,
    maxBounds: [[12.03, 47.06], [12.25, 47.20]],
    hasLayerLegend: false,
    marker: true,
  },
  {
    id: 'planned1',
    status: 'planned',
  },
]

export const DEFAULT_SITE_ID = 'nph'

export function getSite(id) {
  return SITES.find(s => s.id === id) ?? SITES[0]
}
