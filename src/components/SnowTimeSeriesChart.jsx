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
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import { sceneData } from '../data/hydrologicalData';

// ── Appearance ────────────────────────────────────────────────
const MONO      = "'IBM Plex Mono', monospace";
const GAP_COLOR = '#94a3b8';

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

// Monthly median fSCA used for no-data interpolation (matches HydrologicalChart MONTH_MEDIANS)
const MONTH_MEDIANS_DOY = [
  { startDoy: 121, endDoy: 151, centerDoy: 136, label: 'Mai', median: 84 },
  { startDoy: 152, endDoy: 181, centerDoy: 166, label: 'Jun', median: 63 },
  { startDoy: 182, endDoy: 212, centerDoy: 197, label: 'Jul', median: 22 },
  { startDoy: 213, endDoy: 243, centerDoy: 228, label: 'Aug', median:  6 },
  { startDoy: 244, endDoy: 275, centerDoy: 259, label: 'Sep', median:  1 },
];

function doyToLabel(doy) {
  for (let i = MONTH_STARTS.length - 1; i >= 0; i--) {
    if (doy >= MONTH_STARTS[i].doy) return MONTH_STARTS[i].label;
  }
  return '';
}

// ── Gap-data helpers ──────────────────────────────────────────
/**
 * Compute which months lack Sentinel-2 coverage at the start or end of
 * the season, and return dashed-line segments (with bridge endpoints) for
 * those gaps.
 *
 * Returns:
 *   fullGap     – array of {doy, fsca} covering ALL months (no real data at all)
 *   startSegment – array of median points + bridge to first real point
 *   endSegment   – array of bridge from last real point + median points
 *   hasGap       – boolean
 */
function computeGapData(yearData) {
  if (!yearData || yearData.length === 0) {
    return {
      fullGap:      MONTH_MEDIANS_DOY.map(m => ({ doy: m.centerDoy, fsca: m.median })),
      startSegment: null,
      endSegment:   null,
      hasGap:       true,
    };
  }

  const sorted   = [...yearData].sort((a, b) => a.doy - b.doy);
  const firstDoy = sorted[0].doy;
  const lastDoy  = sorted.at(-1).doy;

  // Months entirely BEFORE the first real observation
  const startMissing = MONTH_MEDIANS_DOY.filter(m => m.endDoy < firstDoy);
  // Months entirely AFTER the last real observation
  const endMissing   = MONTH_MEDIANS_DOY.filter(m => m.startDoy > lastDoy);

  // Bridge endpoint is the first/last real data point
  const startSegment = startMissing.length > 0
    ? [...startMissing.map(m => ({ doy: m.centerDoy, fsca: m.median })),
       { doy: sorted[0].doy, fsca: sorted[0].fsca }]
    : null;

  const endSegment = endMissing.length > 0
    ? [{ doy: sorted.at(-1).doy, fsca: sorted.at(-1).fsca },
       ...endMissing.map(m => ({ doy: m.centerDoy, fsca: m.median }))]
    : null;

  return {
    fullGap:      null,
    startSegment,
    endSegment,
    hasGap: startMissing.length > 0 || endMissing.length > 0,
  };
}

// ── NoDataLine — custom SVG via Recharts 3 hook API ───────────
// Renders dashed median-interpolation lines for missing months at the
// start or end of the season. Must be a named React component so it can
// call hooks (useXAxisScale / useYAxisScale).
function NoDataLine({ gapData }) {
  const xScale = useXAxisScale(0);        // XAxis default id = 0
  const yScale = useYAxisScale('left');   // matches yAxisId="left" + allowDataOverflow
  if (!xScale || !yScale || !gapData?.hasGap) return null;

  const { fullGap, startSegment, endSegment } = gapData;

  /** Convert a point array to an SVG path string. */
  function toPath(pts) {
    return pts
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${xScale(pt.doy)},${yScale(pt.fsca)}`)
      .join(' ');
  }

  /**
   * Render one dashed segment.
   * bridgeAtEnd  = true  → last point is the bridge (start segment: median … → real)
   * bridgeAtEnd  = false → first point is the bridge (end segment:  real → … median)
   * bridgeAtEnd  = null  → no bridge (full-gap: all points are medians)
   */
  function renderSeg(pts, bridgeAtEnd, key) {
    if (!pts || pts.length < 2) return null;
    const d         = toPath(pts);
    // Points that get open-circle markers (exclude the bridge endpoint)
    const medianPts = bridgeAtEnd === true  ? pts.slice(0, -1)
                    : bridgeAtEnd === false ? pts.slice(1)
                    : pts;                             // full-gap: all are medians
    const labelPt   = medianPts[Math.floor(medianPts.length / 2)];
    return (
      <g key={key}>
        <path
          d={d}
          stroke={GAP_COLOR}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          fill="none"
          strokeOpacity={0.75}
        />
        {medianPts.map((pt, j) => (
          <circle
            key={j}
            cx={xScale(pt.doy)}
            cy={yScale(pt.fsca)}
            r={3}
            fill="none"
            stroke={GAP_COLOR}
            strokeWidth={1.2}
          />
        ))}
        {labelPt && (
          <text
            x={xScale(labelPt.doy)}
            y={yScale(labelPt.fsca) - 10}
            textAnchor="middle"
            fill={GAP_COLOR}
            fontSize={9}
            fontStyle="italic"
            fontFamily={MONO}
          >
            no data
          </text>
        )}
      </g>
    );
  }

  return (
    <g className="no-data-lines">
      {fullGap      && renderSeg(fullGap,      null,  'full')}
      {startSegment && renderSeg(startSegment, true,  'start')}
      {endSegment   && renderSeg(endSegment,   false, 'end')}
    </g>
  );
}

// ── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, fsca } = payload[0].payload;
  return (
    <div style={{
      background:     'rgba(13,17,23,0.94)',
      border:         '1px solid rgba(255,255,255,0.12)',
      borderRadius:   6,
      padding:        '8px 12px',
      fontSize:       13,
      lineHeight:     1.6,
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

  // Compute gap segments once per render (single-year mode only)
  const gapData = isYearSpecific ? computeGapData(yearData) : null;

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

          {/* allowDataOverflow ensures the explicit domains are honoured even
              when the active Scatter carries no data (NoDataLine hook needs scales). */}
          <XAxis
            dataKey="doy"
            type="number"
            domain={[118, 275]}
            allowDataOverflow
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
            allowDataOverflow
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
            <>
              {/* Actual Sentinel-2 observations for the selected year */}
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

              {/* Dashed no-data median interpolation for gaps at season edges */}
              <NoDataLine gapData={gapData} />

              {/* Invisible placeholder that injects the "Median (keine Daten)" legend entry */}
              {gapData?.hasGap && (
                <Scatter
                  yAxisId="left"
                  name="Median (keine Daten)"
                  data={[]}
                  fill={GAP_COLOR}
                  legendType="line"
                  isAnimationActive={false}
                />
              )}
            </>
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
