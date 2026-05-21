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
  { year: 2018, color: '#94a3b8' },
  { year: 2019, color: '#fb923c' },
  { year: 2020, color: '#60a5fa' },
  { year: 2021, color: '#4ade80' },
  { year: 2022, color: '#f87171' },
  { year: 2023, color: '#c084fc' },
  { year: 2024, color: '#facc15' },
  { year: 2025, color: '#22d3ee' },
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
      <p style={{ margin: 0, color: '#67e8f9' }}>
        Schneebedeckung: <strong>{fsca.toFixed(1)} %</strong>
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
export default function SnowTimeSeriesChart() {
  return (
    <div style={{ width: '100%' }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>
        75 Sentinel-2 Szenen · Einzelbeobachtungen pro Saison (Mai–Sep)
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
            tick={{ fill: '#67e8f9', fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Schneebedeckung (%)',
              angle: -90,
              position: 'insideLeft',
              offset: -32,
              style: { fill: '#67e8f9', fontSize: 12, fontFamily: MONO },
            }}
            name="FSCA"
          />

          {YEARS.map(({ year, color }) => (
            <Scatter
              key={year}
              yAxisId="left"
              name={String(year)}
              data={DATA_BY_YEAR[year]}
              fill={color}
              opacity={0.85}
              r={5}
            />
          ))}

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
