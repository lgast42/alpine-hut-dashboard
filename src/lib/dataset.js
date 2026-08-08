// Access layer over the pipeline export (src/data/*.json).
//
// Everything below reshapes or parses exported records into the forms the
// components consume. Nothing here may aggregate, interpolate or otherwise
// create values that are not literally present in an export file — a missing
// value stays null and renders as a gap. If a number is needed that no export
// file carries, it is added in the pipeline and re-exported, never here.

import precipitationDaily from '../data/precipitation_daily.json'
import snowCoverScenes from '../data/snow_cover_scenes.json'
import monthlySummary from '../data/monthly_summary.json'
import monthlyClimatology from '../data/monthly_climatology.json'
import meltoutExport from '../data/meltout.json'
import winterSweExport from '../data/winter_swe.json'
import metricsExport from '../data/metrics.json'
import exportManifest from '../data/export_manifest.json'

const MONTH_KEYS = { 5: 'may', 6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep' }
const MONTH_LABELS = { 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep' }

// fSCA is exported as a fraction (0–1); the UI shows percent. Display
// scaling only — the same information in a different notation.
const PCT = 100

// Calendar arithmetic on an ISO date string (for axis positioning).
function doyOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1
}

export const manifest = exportManifest

// [firstYear, lastYear] of the complete seasons the climatology covers.
export const climatologyWindow = monthlyClimatology.window

// A season is "running" when it lies beyond the last complete season.
export function isRunningSeason(year) {
  return typeof year === 'number' && year > climatologyWindow[1]
}

// Daily precipitation, one record per exported day.
export const dailyPrecipData = precipitationDaily.map(r => ({
  date: r.date,
  year: Number(r.date.slice(0, 4)),
  doy: doyOf(r.date),
  value: r.rr_mm,
}))

// Individual Sentinel-2 scenes. Point measurements, not a time series.
export const sceneData = snowCoverScenes.map(r => ({
  date: r.date,
  year: Number(r.date.slice(0, 4)),
  doy: doyOf(r.date),
  fsca: r.fsca * PCT,
}))

// Monthly values grouped per year. Months the export does not carry
// (incomplete or before the record) stay null and render as gaps.
export const annualData = (() => {
  const byYear = new Map()
  for (const row of monthlySummary) {
    if (!byYear.has(row.year)) {
      byYear.set(row.year, {
        year: row.year,
        months: Object.fromEntries(
          Object.values(MONTH_KEYS).map(k => [k, { precip: null, snow: null }])
        ),
      })
    }
    byYear.get(row.year).months[MONTH_KEYS[row.month]] = {
      precip: row.rr_sum_mm,
      snow: row.fsca_mean == null ? null : row.fsca_mean * PCT,
    }
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
})()

// Years that have monthly data, ascending (drives year pills and colors).
export const dataYears = annualData.map(r => r.year)

// Cross-year monthly means for the all-years view, computed by the pipeline
// over the complete seasons in climatologyWindow.
export const monthlyAverages = monthlyClimatology.months.map(m => ({
  month: MONTH_LABELS[m.month],
  precipitation: m.rr_mean_mm,
  snow: m.fsca_mean == null ? null : m.fsca_mean * PCT,
}))

// Meltout (Ausaperung): window, trend number, drawable trend segment and
// the two point series — all straight from the export.
export const meltout = meltoutExport

// Maximum snow water equivalent per hydrological year, 1962–2026.
export const winterSweData = winterSweExport

// The three metric tiles, verbatim from the export.
export const metrics = metricsExport

// Cross-year min/max per month (spread band and error bars), same source.
export const varianceData = monthlyClimatology.months.map(m => ({
  month: MONTH_LABELS[m.month],
  precipMin: m.rr_min_mm,
  precipMax: m.rr_max_mm,
  snowMin: m.fsca_min == null ? null : m.fsca_min * PCT,
  snowMax: m.fsca_max == null ? null : m.fsca_max * PCT,
}))
