import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  ErrorBar,
} from 'recharts';
import { monthlyAverages, varianceData } from '../data/hydrologicalData';

const MONO = "'IBM Plex Mono', monospace";

// Dark-theme palette
const C = {
  grid:        'rgba(255,255,255,0.07)',
  axis:        'rgba(255,255,255,0.15)',
  textMuted:   '#94a3b8',
  textPrimary: '#e2e8f0',
  precip:      '#3b82f6',
  precipDark:  '#2563eb',
  snow:        '#67e8f9',
  snowRange:   'rgba(103,232,249,0.15)',
  vulnFill:    'rgba(252,165,165,0.12)',
  vulnStroke:  'rgba(248,113,113,0.40)',
  vulnLabel:   '#fca5a5',
  tooltipBg:   'rgba(13,17,23,0.94)',
  tooltipBord: 'rgba(255,255,255,0.12)',
};

const chartData = monthlyAverages.map((m, i) => ({
  ...m,
  ...varianceData[i],
  precipError: [
    m.precipitation - varianceData[i].precipMin,
    varianceData[i].precipMax - m.precipitation,
  ],
  snowRange: [varianceData[i].snowMin, varianceData[i].snowMax],
}));

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const d = chartData.find((r) => r.month === label);
  if (!d) return null;

  return (
    <div style={{
      background: C.tooltipBg,
      border: `1px solid ${C.tooltipBord}`,
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 13,
      lineHeight: 1.7,
      backdropFilter: 'blur(8px)',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: C.textPrimary }}>{label}</p>
      <p style={{ margin: 0, color: C.precip }}>
        Niederschlag: <strong>{d.precipitation} mm</strong>
        <span style={{ color: C.textMuted, fontWeight: 400 }}>
          {' '}({d.precipMin}–{d.precipMax} mm)
        </span>
      </p>
      <p style={{ margin: 0, color: C.snow }}>
        Schneebedeckung: <strong>{d.snow !== null ? `${d.snow}%` : '—'}</strong>
        <span style={{ color: C.textMuted, fontWeight: 400 }}>
          {' '}({d.snowMin}%–{d.snowMax}%)
        </span>
      </p>
    </div>
  );
}

export default function HydrologicalChart() {
  return (
    <div className="hydrological-chart" style={{ width: '100%' }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: C.textMuted }}>
        Monatsmittelwerte der Bewirtschaftungssaison · Streuung 2018–2025
      </p>

      <ResponsiveContainer width="100%" height={360} minHeight={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 48, bottom: 8, left: 48 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fill: C.textMuted, fontSize: 13, fontFamily: MONO }}
            axisLine={{ stroke: C.axis }}
            tickLine={false}
          />

          {/* Left axis: Precipitation */}
          <YAxis
            yAxisId="left"
            domain={[0, 500]}
            tickCount={6}
            tick={{ fill: C.precip, fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Niederschlag (mm)',
              angle: -90,
              position: 'insideLeft',
              offset: -32,
              style: { fill: C.precip, fontSize: 12, fontFamily: MONO },
            }}
          />

          {/* Right axis: Snow Cover */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickCount={6}
            tick={{ fill: C.snow, fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Schneebedeckung (%)',
              angle: 90,
              position: 'insideRight',
              offset: -32,
              style: { fill: C.snow, fontSize: 12, fontFamily: MONO },
            }}
          />

          {/* Vulnerability phase annotation */}
          <ReferenceArea
            yAxisId="left"
            x1="Jul"
            x2="Sep"
            fill={C.vulnFill}
            stroke={C.vulnStroke}
            strokeDasharray="4 3"
            label={{
              value: 'Vulnerabilitätsphase',
              position: 'insideTopRight',
              fill: C.vulnLabel,
              fontSize: 11,
              fontStyle: 'italic',
            }}
          />

          {/* Precipitation bar with error bars */}
          <Bar
            yAxisId="left"
            dataKey="precipitation"
            name="Mittlerer Niederschlag (mm)"
            fill={C.precip}
            fillOpacity={0.75}
            barSize={40}
            radius={[2, 2, 0, 0]}
          >
            <ErrorBar
              dataKey="precipError"
              width={5}
              strokeWidth={1.5}
              stroke={C.precipDark}
              direction="y"
            />
          </Bar>

          {/* Snow cover range band */}
          <Area
            yAxisId="right"
            dataKey="snowRange"
            name="_snowRange"
            fill={C.snowRange}
            stroke="none"
            fillOpacity={1}
            legendType="none"
            tooltipType="none"
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Snow cover mean line */}
          <Line
            yAxisId="right"
            dataKey="snow"
            name="Mittlere Schneebedeckung (%)"
            stroke={C.snow}
            strokeWidth={2.5}
            dot={{ r: 5, fill: C.snow, strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="square"
            wrapperStyle={{ paddingTop: 16, fontSize: 13, color: C.textMuted }}
            formatter={(value) => value.startsWith('_') ? null : value}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
