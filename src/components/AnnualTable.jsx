import { useState } from 'react'
import { annualData } from '../data/hydrologicalData'

const MONTHS = [
  { key: 'may', label: 'Mai' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
]

function snowColor(snow) {
  if (snow === null) return { bg: '#F7FAFC', color: '#CBD5E0' }
  if (snow >= 80)   return { bg: '#2B6CB0', color: '#FFFFFF' }
  if (snow >= 50)   return { bg: '#63B3ED', color: '#2D3748' }
  if (snow >= 20)   return { bg: '#BEE3F8', color: '#2D3748' }
  if (snow >= 5)    return { bg: '#FED7D7', color: '#2D3748' }
  return                   { bg: '#FC8181', color: '#2D3748' }
}

export default function AnnualTable() {
  const [hoveredYear, setHoveredYear] = useState(null)

  const cellBase = {
    padding: '8px 10px',
    border: '1px solid #E2E8F0',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    textAlign: 'right',
    verticalAlign: 'middle',
  }

  const headerCell = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: '#718096',
    padding: '8px 10px',
    borderBottom: '2px solid #E2E8F0',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2D3748', margin: '0 0 4px' }}>
        Ab 2022: Schnee spielt im Juli keine Rolle mehr für die Wasserversorgung
      </h3>
      <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
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
                    color: '#2D3748',
                    background: isHovered ? '#EBF8FF' : 'white',
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
