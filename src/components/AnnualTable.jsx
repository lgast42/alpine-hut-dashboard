import { useState } from 'react'
import { annualData } from '../data/hydrologicalData'

const MONTHS = [
  { key: 'may', label: 'Mai' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
]

// Snow-cover heat-map colours tuned for dark background
function snowColor(snow) {
  if (snow === null) return { bg: 'rgba(255,255,255,0.04)', color: '#475569' }
  if (snow >= 80)   return { bg: '#1d4ed8',                color: '#dbeafe' }
  if (snow >= 50)   return { bg: '#2563eb',                color: '#bfdbfe' }
  if (snow >= 20)   return { bg: '#1e40af',                color: '#93c5fd' }
  if (snow >= 5)    return { bg: '#7c2d12',                color: '#fed7aa' }
  return                   { bg: '#991b1b',                color: '#fecaca' }
}

export default function AnnualTable() {
  const [hoveredYear, setHoveredYear] = useState(null)

  const cellBase = {
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    textAlign: 'right',
    verticalAlign: 'middle',
  }

  const headerCell = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: '#94a3b8',
    padding: '8px 10px',
    borderBottom: '2px solid rgba(255,255,255,0.12)',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    background: 'transparent',
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
        Monatliche Werte · '—' = keine Daten (Wolkenbedeckung bei Sentinel-2)
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>Jahr</th>
              {MONTHS.map(m => (
                <th key={m.key} style={headerCell}>{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {annualData.map(row => {
              const isHovered = hoveredYear === row.year
              return (
                <tr
                  key={row.year}
                  onMouseEnter={() => setHoveredYear(row.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  <td style={{
                    ...cellBase,
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    background: isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                  }}>
                    {row.year}
                  </td>
                  {MONTHS.map(m => {
                    const { precip, snow } = row.months[m.key]
                    const { bg, color } = snowColor(snow)
                    return (
                      <td key={m.key} style={{ ...cellBase, background: bg, color }}>
                        <div>{precip.toFixed(1)} mm</div>
                        <div style={{ fontSize: 11 }}>
                          {snow === null ? '—' : `${snow.toFixed(1)}%`}
                        </div>
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
