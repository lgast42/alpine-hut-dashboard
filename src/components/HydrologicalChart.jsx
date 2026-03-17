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
      background: '#fff',
      border: '1px solid #CBD5E0',
      borderRadius: 4,
      padding: '10px 14px',
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#2D3748' }}>{label}</p>
      <p style={{ margin: 0, color: '#3182CE' }}>
        Precipitation: <strong>{d.precipitation} mm</strong>
        <span style={{ color: '#718096', fontWeight: 400 }}>
          {' '}({d.precipMin} mm – {d.precipMax} mm)
        </span>
      </p>
      <p style={{ margin: 0, color: '#2B6CB0' }}>
        Snow Cover: <strong>{d.snow}%</strong>
        <span style={{ color: '#718096', fontWeight: 400 }}>
          {' '}({d.snowMin}% – {d.snowMax}%)
        </span>
      </p>
    </div>
  );
}

export default function HydrologicalChart() {
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        textAlign: 'left',
        fontSize: 16,
        fontWeight: 600,
        color: '#2D3748',
        margin: '0 0 4px',
        lineHeight: 1.4,
      }}>
        Schneebedeckung sinkt bis Juli auf unter 30 % — der Versorgungspuffer schwindet
      </h3>
      <p style={{
        margin: '0 0 16px',
        fontSize: 13,
        color: '#718096',
        lineHeight: 1.4,
      }}>
        Monatsmittelwerte der Bewirtschaftungssaison · Streuung 2018–2025
      </p>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 48, bottom: 8, left: 48 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fill: '#4A5568', fontSize: 13, fontFamily: MONO }}
            axisLine={{ stroke: '#CBD5E0' }}
            tickLine={false}
          />

          {/* Left axis: Precipitation */}
          <YAxis
            yAxisId="left"
            domain={[0, 500]}
            tickCount={6}
            tick={{ fill: '#2B6CB0', fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Precipitation (mm)',
              angle: -90,
              position: 'insideLeft',
              offset: -32,
              style: { fill: '#2B6CB0', fontSize: 12, fontFamily: MONO },
            }}
          />

          {/* Right axis: Snow Cover */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickCount={6}
            tick={{ fill: '#4A5568', fontSize: 12, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Snow Cover (%)',
              angle: 90,
              position: 'insideRight',
              offset: -32,
              style: { fill: '#4A5568', fontSize: 12, fontFamily: MONO },
            }}
          />

          {/* Vulnerability phase annotation */}
          <ReferenceArea
            yAxisId="left"
            x1="Jul"
            x2="Sep"
            fill="#FEB2B2"
            fillOpacity={0.18}
            stroke="#FC8181"
            strokeOpacity={0.4}
            strokeDasharray="4 3"
            label={{
              value: 'Vulnerabilitätsphase',
              position: 'insideTopRight',
              fill: '#C53030',
              fontSize: 11,
              fontStyle: 'italic',
            }}
          />

          {/* Precipitation bar with error bars */}
          <Bar
            yAxisId="left"
            dataKey="precipitation"
            name="Precipitation (mm)"
            fill="#3182CE"
            fillOpacity={0.8}
            barSize={40}
            radius={[2, 2, 0, 0]}
          >
            <ErrorBar
              dataKey="precipError"
              width={5}
              strokeWidth={1.5}
              stroke="#2B6CB0"
              direction="y"
            />
          </Bar>

          {/* Snow cover range band */}
          <Area
            yAxisId="right"
            dataKey="snowRange"
            name="_snowRange"
            fill="#BEE3F8"
            stroke="none"
            fillOpacity={0.45}
            legendType="none"
            tooltipType="none"
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Snow cover mean line */}
          <Line
            yAxisId="right"
            dataKey="snow"
            name="Snow Cover (%)"
            stroke="#2B6CB0"
            strokeWidth={3}
            dot={{ r: 5, fill: '#2B6CB0', strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="square"
            wrapperStyle={{ paddingTop: 16, fontSize: 13, color: '#4A5568' }}
            formatter={(value) => value.startsWith('_') ? null : value}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
