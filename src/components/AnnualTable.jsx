import { useState } from 'react'
import { annualData, sceneData } from '../lib/dataset'
import { useLanguage } from '../i18n/LanguageContext'

// ── Constants ──────────────────────────────────────────────────
const MONTHS = [
  { key: 'may', tKey: 'May' },
  { key: 'jun', tKey: 'Jun' },
  { key: 'jul', tKey: 'Jul' },
  { key: 'aug', tKey: 'Aug' },
  { key: 'sep', tKey: 'Sep' },
]

// Maps month key → 2-digit string for sceneData date comparison
const MONTH_NUM = { may: '05', jun: '06', jul: '07', aug: '08', sep: '09' }
const MONO      = "'IBM Plex Mono', monospace"

// ── Data helpers ───────────────────────────────────────────────

/** Number of Sentinel-2 scenes for a given month key + year */
function getScenesCount(monthKey, year) {
  return sceneData.filter(
    s => s.date.slice(5, 7) === MONTH_NUM[monthKey] && s.year === year
  ).length
}

// ── Colour functions ───────────────────────────────────────────

/** Snow-cover heatmap: blue = high/safe → red = low/vulnerable */
function snowColor(snow) {
  if (snow === null) return { bg: 'rgba(255,255,255,0.04)', color: '#475569' }
  if (snow >= 80)   return { bg: '#1d4ed8',                color: '#dbeafe' }
  if (snow >= 50)   return { bg: '#2563eb',                color: '#bfdbfe' }
  if (snow >= 20)   return { bg: '#1e40af',                color: '#93c5fd' }
  if (snow >=  5)   return { bg: '#7c2d12',                color: '#fed7aa' }
  return                   { bg: '#991b1b',                color: '#fecaca' }
}

/** Precipitation heatmap: light → dark blue with rising mm */
function precipColor(precip) {
  if (precip === null) return { bg: 'rgba(255,255,255,0.04)', color: '#475569' }
  if (precip >= 300)   return { bg: '#1e3a8a',               color: '#bfdbfe' }
  if (precip >= 240)   return { bg: '#1d4ed8',               color: '#dbeafe' }
  if (precip >= 180)   return { bg: 'rgba(37,99,235,0.55)',  color: '#bfdbfe' }
  if (precip >= 130)   return { bg: 'rgba(59,130,246,0.30)', color: '#93c5fd' }
  return                      { bg: 'rgba(59,130,246,0.12)', color: '#7dd3fc' }
}

// ── Component ──────────────────────────────────────────────────
export default function AnnualTable({
  activeCategory   = 'combined',
  selectedYear     = 'all',
  activeDataDetail = null,
  onDataDetailChange,
}) {
  const { t } = useLanguage()
  const [hoveredYear, setHoveredYear] = useState(null)
  const [clickedCell, setClickedCell] = useState(null) // { key, scenes }

  // The local selection only counts while this table owns activeDataDetail;
  // when another component takes it over, the stored cell is ignored.
  const effectiveClickedCell =
    activeDataDetail?.source === 'annual-table' ? clickedCell : null

  function handleCellClick(year, monthKey, value, unit) {
    const key = `${year}-${monthKey}`
    if (effectiveClickedCell?.key === key) {
      // Second click → dismiss
      setClickedCell(null)
      onDataDetailChange?.(null)
      return
    }
    const scenes = getScenesCount(monthKey, year)
    setClickedCell({ key, scenes })
    onDataDetailChange?.({
      source:      'annual-table',
      year,
      month:       monthKey,
      value,
      unit,
      scenesCount: scenes,
    })
  }

  // ── Base styles ─────────────────────────────────────────────
  const cellBase = {
    padding:       '7px 10px',
    border:        '1px solid rgba(255,255,255,0.08)',
    fontFamily:    MONO,
    fontSize:      13,
    textAlign:     'right',
    verticalAlign: 'middle',
    cursor:        'pointer',
  }

  const headerCell = {
    fontFamily:   MONO,
    fontSize:     12,
    color:        '#94a3b8',
    padding:      '7px 10px',
    borderBottom: '2px solid rgba(255,255,255,0.12)',
    textAlign:    'right',
    whiteSpace:   'nowrap',
    background:   'transparent',
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
          {t(`table.${activeCategory}.title`)}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {t(`table.${activeCategory}.subtitle`)}
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width:              '100%',
          borderCollapse:     'collapse',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>{t('table.year')}</th>
              {MONTHS.map(m => (
                <th key={m.key} style={headerCell}>{t(`months.${m.tKey}`)}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {annualData.map(row => {
              const isSelected = selectedYear !== 'all' && selectedYear === row.year
              const isHovered  = hoveredYear === row.year

              return (
                <tr
                  key={row.year}
                  onMouseEnter={() => setHoveredYear(row.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {/* ── Year label cell ───────────────────── */}
                  <td style={{
                    ...cellBase,
                    cursor:     'default',
                    textAlign:  'left',
                    fontWeight: 600,
                    color:      isSelected ? '#22d3ee' : '#e2e8f0',
                    background: isSelected
                      ? 'rgba(0,188,212,0.15)'
                      : isHovered
                        ? 'rgba(59,130,246,0.12)'
                        : 'rgba(255,255,255,0.03)',
                    // Left accent stripe for selected row
                    boxShadow:  isSelected
                      ? 'inset 3px 0 0 rgba(0,188,212,0.80)'
                      : undefined,
                  }}>
                    {row.year}
                  </td>

                  {/* ── Data cells ────────────────────────── */}
                  {MONTHS.map(m => {
                    const { precip, snow } = row.months[m.key]
                    const cellKey   = `${row.year}-${m.key}`
                    const isClicked = effectiveClickedCell?.key === cellKey
                    const scenes    = isClicked ? effectiveClickedCell.scenes : null

                    // Heatmap colour depends on active category
                    const { bg, color } = activeCategory === 'precip'
                      ? precipColor(precip)
                      : snowColor(snow)

                    // Selection: top + bottom accent line via box-shadow on <td>
                    // (box-shadow is reliable on <td>; not on <tr>)
                    const selectionShadow = isSelected
                      ? 'inset 0 2px 0 rgba(0,188,212,0.45), inset 0 -2px 0 rgba(0,188,212,0.45)'
                      : undefined
                    const clickShadow = isClicked
                      ? 'inset 0 0 0 2px rgba(255,255,255,0.45)'
                      : undefined

                    return (
                      <td
                        key={m.key}
                        title={t('table.scene_title', { n: getScenesCount(m.key, row.year) })}
                        style={{
                          ...cellBase,
                          background: bg,
                          color,
                          filter:    isHovered ? 'brightness(1.10)' : undefined,
                          boxShadow: clickShadow ?? selectionShadow,
                        }}
                        onClick={() => {
                          const val  = activeCategory === 'precip' ? precip : snow
                          const unit = activeCategory === 'precip' ? 'mm'   : '%'
                          handleCellClick(row.year, m.key, val, unit)
                        }}
                      >
                        {/* ── Primary value ─────────────────── */}
                        {activeCategory === 'precip' && (
                          <div>
                            {precip !== null ? `${Math.round(precip)} mm` : '—'}
                          </div>
                        )}

                        {activeCategory === 'snow' && (
                          <div>
                            {snow !== null ? `${snow.toFixed(1)} %` : '—'}
                          </div>
                        )}

                        {activeCategory === 'combined' && (
                          <>
                            {/* fSCA as primary */}
                            <div>
                              {snow !== null ? `${snow.toFixed(1)} %` : '—'}
                            </div>
                            {/* Precipitation as secondary sub-label */}
                            <div style={{
                              fontSize:   10,
                              color:      'rgba(255,255,255,0.38)',
                              marginTop:  2,
                              lineHeight: 1.3,
                            }}>
                              {precip !== null ? `${Math.round(precip)} mm` : '—'}
                            </div>
                          </>
                        )}

                        {/* ── Scene count badge (on click) ───── */}
                        {isClicked && (
                          <div style={{
                            marginTop:    4,
                            display:      'inline-block',
                            fontSize:     10,
                            lineHeight:   1.4,
                            color:        'rgba(255,255,255,0.90)',
                            background:   'rgba(0,0,0,0.60)',
                            borderRadius: 3,
                            padding:      '1px 5px',
                            whiteSpace:   'nowrap',
                          }}>
                            {scenes} {scenes === 1 ? t('table.scene_one') : t('table.scene_many')}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
