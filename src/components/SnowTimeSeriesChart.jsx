import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { sceneData } from '../data/hydrologicalData';

// ── Appearance ────────────────────────────────────────────────
const MONO = "'IBM Plex Mono', monospace";

const YEARS = [
  { year: 2018, color: '#9ca3af' },  // slate grey
  { year: 2019, color: '#f97316' },  // orange
  { year: 2020, color: '#10b981' },  // emerald
  { year: 2021, color: '#a3e635' },  // lime
  { year: 2022, color: '#ef4444' },  // red
  { year: 2023, color: '#c084fc' },  // purple
  { year: 2024, color: '#fbbf24' },  // amber
  { year: 2025, color: '#ec4899' },  // pink
];

// Pre-split data per year so Recharts can render independent Scatter series
const DATA_BY_YEAR = Object.fromEntries(
  YEARS.map(({ year }) => [year, sceneData.filter(s => s.year === year)])
);

// Month boundaries (first DOY of each month, non-leap)
const MONTH_STARTS = [
  { doy: 121, label: 'Mai' },
  { doy: 152, label: 'Jun' },
  { doy: 182, label: 'Jul' },
  { doy: 213, label: 'Aug' },
  { doy: 244, label: 'Sep' },
];

function doyToLabel(doy) {
  for (let i = MONTH_STARTS.length - 1; i >= 0; i--) {
    if (doy >= MONTH_STARTS[i].doy) return MONTH_STARTS[i].label;
  }
  return '';
}

// ── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, fsca } = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(13,17,23,0.94)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 13,
      lineHeight: 1.6,
      backdropFilter: 'blur(8px)',
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>{date}</p>
      <p style={{ margin: 0, color: '#e2e8f0' }}>
        Schneebedeckung: <strong>{fsca.toFixed(1)} %</strong>
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
export default function SnowTimeSeriesChart({ selectedYear = 'all', activeDataDetail, onDataDetailChange }) {
  const isYearSpecific = selectedYear !== 'all';
  const yearEntry      = isYearSpecific ? YEARS.find(y => y.year === selectedYear) : null;
  const yearData       = isYearSpecific ? (DATA_BY_YEAR[selectedYear] ?? []) : [];
  const sceneCount     = isYearSpecific ? yearData.length : sceneData.length;
  const axisColor      = isYearSpecific ? (yearEntry?.color ?? '#e2e8f0') : '#94a3b8';

  const subtitle = isYearSpecific
    ? `${sceneCount} Sentinel-2 ${sceneCount === 1 ? 'Szene' : 'Szenen'} · Saison ${selectedYear} (Mai–Sep)`
    : `${sceneCount} Sentinel-2 Szenen · Einzelbeobachtungen pro Saison (Mai–Sep)`;

  return (
    <div style={{ width: '100%' }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
        {subtitle}
      </p>

      <ResponsiveContainer width="100%" height={320} minHeight={260}>
        <ScatterChart margin={{ top: 10, right: 24, bottom: 8, left: 48 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.07)" vertical={false} />

          {/* Month boundary lines */}
          {MONTH_STARTS.map(({ doy, label }) => (
            <ReferenceLine
              key={label}
              x={doy}
              yAxisId="left"
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="3 3"
            />
          ))}

          <XAxis
            dataKey="doy"
            type="number"
            domain={[118, 275]}
            ticks={MONTH_STARTS.map(m => m.doy + 15)}
            tickFormatter={doy => doyToLabel(doy + 5)}
            tick={{ fill: '#94a3b8', fontSize: 13, fontFamily: MONO }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            tickLine={false}
            name="DOY"
          />

          <YAxis
            yAxisId="left"
            dataKey="fsca"
            type="number"
            domain={[0, 100]}
            tickCount={6}
            tickFormatter={v => `${v}%`}
            tick={{ fill: axisColor, fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Schneebedeckung (%)',
              angle: -90,
              position: 'insideLeft',
              offset: -32,
              style: { fill: axisColor, fontSize: 12, fontFamily: MONO },
            }}
            name="FSCA"
          />

          {isYearSpecific ? (
            /* Single year: scatter dots connected by a line in chronological order */
            <Scatter
              key={selectedYear}
              yAxisId="left"
              name={String(selectedYear)}
              data={yearData}
              fill={yearEntry?.color ?? '#e2e8f0'}
              opacity={0.9}
              r={5}
              line={{ stroke: yearEntry?.color ?? '#e2e8f0', strokeWidth: 2, strokeOpacity: 0.7 }}
              lineType="joint"
            />
          ) : (
            /* All years: one scatter series per year, no connecting lines */
            YEARS.map(({ year, color }) => (
              <Scatter
                key={year}
                yAxisId="left"
                name={String(year)}
                data={DATA_BY_YEAR[year]}
                fill={color}
                opacity={0.85}
                r={5}
              />
            ))
          )}

          <Tooltip content={<CustomTooltip />} cursor={false} />

          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ paddingTop: 14, fontSize: 13, color: '#94a3b8' }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
