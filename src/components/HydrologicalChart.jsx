import { useMemo, useCallback } from 'react';
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
import { monthlyAverages, varianceData, annualData, sceneData } from '../data/hydrologicalData';

// ── Constants ──────────────────────────────────────────────────
const MONO = "'IBM Plex Mono', monospace";

const C = {
  grid:        'rgba(255,255,255,0.07)',
  axis:        'rgba(255,255,255,0.15)',
  textMuted:   '#94a3b8',
  textPrimary: '#e2e8f0',
  precip:      '#3b82f6',
  precipDark:  '#2563eb',
  snow:        '#E2E8F0',
  snowFill:    'rgba(226,232,240,0.15)',
  snowRange:   'rgba(226,232,240,0.15)',
  snowGap:     '#94a3b8',
  vulnFill:    'rgba(252,165,165,0.12)',
  vulnStroke:  'rgba(248,113,113,0.40)',
  vulnLabel:   '#fca5a5',
  tooltipBg:   'rgba(13,17,23,0.94)',
  tooltipBord: 'rgba(255,255,255,0.12)',
};

const MONTH_NUM   = { May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09' };
const MONTH_KEYS  = { May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'aug', Sep: 'sep' };
const MONTH_ORDER = ['May', 'Jun', 'Jul', 'Aug', 'Sep'];
const MONTH_DE    = { May: 'Mai', Jun: 'Juni', Jul: 'Juli', Aug: 'August', Sep: 'September' };

// Monthly medians used as substitutes for edge-null snow values
const MONTH_MEDIANS = { May: 84, Jun: 63, Jul: 22, Aug: 6, Sep: 1 };

// ── Data helpers ───────────────────────────────────────────────

function getScenesCount(month, year) {
  return sceneData.filter(s => {
    if (s.date.slice(5, 7) !== MONTH_NUM[month]) return false;
    return year === 'all' || s.year === year;
  }).length;
}

/**
 * For a year-specific series, enrich each point with:
 *   snowInterp      – estimated value at null positions so a dashed gap line can be drawn
 *   snowIsMedian    – true where the monthly median was used (edge gap, no real data)
 *   snowNoDataLabel – true at the central position of each edge gap (renders "no data" text)
 *
 * Edge nulls   → substitute with MONTH_MEDIANS; bridge to the first/last real value.
 * Middle nulls → linear interpolation between the two surrounding real values; bridge
 *                endpoints are also included so the dashed segment connects seamlessly.
 */
function addSnowInterp(points) {
  const n         = points.length;
  const snowVals  = points.map(p => p.snow);
  const interp    = new Array(n).fill(null);
  const isMedian  = new Array(n).fill(false);
  const hasLabel  = new Array(n).fill(false);

  let firstReal = n, lastReal = -1;
  for (let i = 0; i < n; i++) {
    if (snowVals[i] != null) {
      if (i < firstReal) firstReal = i;
      if (i > lastReal)  lastReal  = i;
    }
  }

  // All months missing → full median line
  if (firstReal === n) {
    for (let i = 0; i < n; i++) { interp[i] = MONTH_MEDIANS[MONTH_ORDER[i]]; isMedian[i] = true; }
    hasLabel[Math.floor(n / 2)] = true;
    return points.map((p, i) => ({ ...p, snowInterp: interp[i], snowIsMedian: isMedian[i], snowNoDataLabel: hasLabel[i] }));
  }

  // Edge-start gap
  if (firstReal > 0) {
    for (let i = 0; i < firstReal; i++) { interp[i] = MONTH_MEDIANS[MONTH_ORDER[i]]; isMedian[i] = true; }
    interp[firstReal] = snowVals[firstReal]; // bridge endpoint on real side
    hasLabel[Math.floor(firstReal / 2)] = true;
  }

  // Edge-end gap
  if (lastReal < n - 1) {
    for (let i = lastReal + 1; i < n; i++) { interp[i] = MONTH_MEDIANS[MONTH_ORDER[i]]; isMedian[i] = true; }
    interp[lastReal] = snowVals[lastReal]; // bridge endpoint on real side
    hasLabel[lastReal + 1 + Math.floor((n - 1 - lastReal) / 2)] = true;
  }

  // Middle gaps → linear interpolation
  for (let i = firstReal + 1; i < lastReal; i++) {
    if (snowVals[i] != null) continue;
    let left = i - 1;
    while (snowVals[left] == null) left--;
    let right = i + 1;
    while (right < n && snowVals[right] == null) right++;
    const t    = (i - left) / (right - left);
    interp[i]     = parseFloat((snowVals[left] + t * (snowVals[right] - snowVals[left])).toFixed(1));
    interp[left]  = snowVals[left];
    interp[right] = snowVals[right];
  }

  return points.map((p, i) => ({
    ...p,
    snowInterp:      interp[i],
    snowIsMedian:    isMedian[i],
    snowNoDataLabel: hasLabel[i],
  }));
}

/**
 * Build the array Recharts will consume.
 * 'all'          → monthly cross-year means + variance bands + error bars
 * specific year  → exact monthly values with gap-interpolation metadata
 */
function buildChartData(selectedYear) {
  if (selectedYear === 'all') {
    return monthlyAverages.map((m, i) => ({
      month:           m.month,
      precipitation:   m.precipitation,
      snow:            m.snow,
      snowInterp:      null,
      snowIsMedian:    false,
      snowNoDataLabel: false,
      precipError:     [m.precipitation - varianceData[i].precipMin, varianceData[i].precipMax - m.precipitation],
      snowRange:       [varianceData[i].snowMin, varianceData[i].snowMax],
      precipMin:       varianceData[i].precipMin,
      precipMax:       varianceData[i].precipMax,
      scenesCount:     getScenesCount(m.month, 'all'),
    }));
  }

  const entry = annualData.find(d => d.year === selectedYear);
  const rawPoints = MONTH_ORDER.map(month => {
    const m = entry?.months[MONTH_KEYS[month]];
    return {
      month,
      precipitation:   m?.precip ?? null,
      snow:            m?.snow   ?? null,
      snowInterp:      null,
      snowIsMedian:    false,
      snowNoDataLabel: false,
      precipError:     null,
      snowRange:       null,
      precipMin:       null,
      precipMax:       null,
      scenesCount:     getScenesCount(month, selectedYear),
    };
  });

  return addSnowInterp(rawPoints);
}

/** German-language summary string for the detail popup. */
function formatDetail(d) {
  if (!d) return '';
  const yearStr  = d.year === 'all' ? '2018–2025' : String(d.year);
  const monthStr = MONTH_DE[d.month] ?? d.month;
  const n        = d.scenesCount;
  const scLabel  = `${n} Sentinel-2 ${n === 1 ? 'Szene' : 'Szenen'}`;
  if (d.type === 'snow') {
    const val = d.value != null ? `${Number(d.value).toFixed(1)} %` : 'keine Daten';
    return `${monthStr} ${yearStr}: fSCA ${val} · Berechnet aus ${scLabel}`;
  }
  const val = d.value != null ? `${d.value} mm` : 'keine Daten';
  return `${monthStr} ${yearStr}: Niederschlag ${val} · SPARTACUS v2.1`;
}

// ── Component ──────────────────────────────────────────────────
export default function HydrologicalChart({
  activeCategory   = 'combined',
  selectedYear     = 'all',
  activeDataDetail = null,
  onPointClick,
}) {
  const chartData = useMemo(() => buildChartData(selectedYear), [selectedYear]);

  const showSnow       = activeCategory !== 'precip';
  const showPrecip     = activeCategory !== 'snow';
  const isYearSpecific = selectedYear !== 'all';
  // Vulnerability overlay only makes sense for the combined multi-year view
  const showVulnArea   = selectedYear === 'all' && activeCategory === 'combined';

  const refAreaAxisId = showPrecip ? 'left' : 'right';

  // ── Click handler ────────────────────────────────────────────
  function handleClick(data, type) {
    if (!onPointClick || !data) return;
    onPointClick({
      source:      'hydro-chart',
      month:       data.month,
      type,
      value:       type === 'snow' ? data.snow : data.precipitation,
      unit:        type === 'snow' ? '%' : 'mm',
      year:        selectedYear,
      scenesCount: data.scenesCount,
    });
  }

  // ── Tooltip ──────────────────────────────────────────────────
  const renderTooltip = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = chartData.find(r => r.month === label);
    if (!d) return null;
    return (
      <div style={{
        background:     C.tooltipBg,
        border:         `1px solid ${C.tooltipBord}`,
        borderRadius:   6,
        padding:        '10px 14px',
        fontSize:       13,
        lineHeight:     1.7,
        backdropFilter: 'blur(8px)',
      }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.textPrimary }}>{label}</p>

        {showPrecip && (
          <p style={{ margin: 0, color: C.precip }}>
            Niederschlag:{' '}
            <strong>{d.precipitation != null ? `${d.precipitation} mm` : '—'}</strong>
            {!isYearSpecific && d.precipMin != null && (
              <span style={{ color: C.textMuted, fontWeight: 400 }}>
                {' '}({d.precipMin}–{d.precipMax} mm)
              </span>
            )}
          </p>
        )}

        {showSnow && (
          <p style={{ margin: 0, color: C.snow }}>
            Schneebedeckung:{' '}
            <strong>{d.snow != null ? `${d.snow} %` : '—'}</strong>
            {!isYearSpecific && d.snowRange && (
              <span style={{ color: C.textMuted, fontWeight: 400 }}>
                {' '}({d.snowRange[0]}%–{d.snowRange[1]}%)
              </span>
            )}
          </p>
        )}

        <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: 11 }}>
          {d.scenesCount} Sentinel-2 {d.scenesCount === 1 ? 'Szene' : 'Szenen'}
        </p>
      </div>
    );
  }, [chartData, showSnow, showPrecip, isYearSpecific]);

  // ── Custom dot for gap line ──────────────────────────────────
  // Renders an open circle at median-substituted positions; adds a "no data"
  // annotation at the centre of each edge gap.
  const renderInterpDot = useCallback((props) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null) return null;
    const point = chartData[index];
    if (!point || point.snowInterp == null) return null;
    // Bridge endpoints (real values included just for line continuity) → invisible
    if (!point.snowIsMedian) return <g key={`interp-bridge-${index}`} />;
    return (
      <g key={`interp-median-${index}`}>
        <circle cx={cx} cy={cy} r={3} fill="none" stroke={C.snowGap} strokeWidth={1.2} />
        {point.snowNoDataLabel && (
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize={9}
            fontStyle="italic"
            fontFamily={MONO}
          >
            no data
          </text>
        )}
      </g>
    );
  }, [chartData]);

  const popup = activeDataDetail?.source === 'hydro-chart' ? activeDataDetail : null;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="hydrological-chart">
      <p style={{ margin: '0 0 10px', fontSize: 13, color: C.textMuted }}>
        {isYearSpecific
          ? `Jahresverlauf ${selectedYear} · Monatliche Messwerte`
          : 'Monatsmittelwerte der Bewirtschaftungssaison · Streuung 2018–2025'}
      </p>

      <div className="hydro-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 48, bottom: 8, left: 48 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fill: C.textMuted, fontSize: 12, fontFamily: MONO }}
              axisLine={{ stroke: C.axis }}
              tickLine={false}
            />

            {/* Left axis: Precipitation */}
            {showPrecip && (
              <YAxis
                yAxisId="left"
                domain={[0, 500]}
                tickCount={6}
                tick={{ fill: C.precip, fontSize: 11, fontFamily: MONO }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'Niederschlag (mm)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -32,
                  style: { fill: C.precip, fontSize: 11, fontFamily: MONO },
                }}
              />
            )}

            {/* Right axis: Snow Cover */}
            {showSnow && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickCount={6}
                tick={{ fill: C.snow, fontSize: 11, fontFamily: MONO }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                label={{
                  value: 'Schneebedeckung (%)',
                  angle: 90,
                  position: 'insideRight',
                  offset: -32,
                  style: { fill: C.snow, fontSize: 11, fontFamily: MONO },
                }}
              />
            )}

            {/* Vulnerability phase — only combined all-years view */}
            {showVulnArea && (
              <ReferenceArea
                yAxisId={refAreaAxisId}
                x1="Jul"
                x2="Sep"
                fill={C.vulnFill}
                stroke={C.vulnStroke}
                strokeDasharray="4 3"
                label={{
                  value: 'Vulnerabilitätsphase',
                  position: 'insideTopRight',
                  fill: C.vulnLabel,
                  fontSize: 10,
                  fontStyle: 'italic',
                }}
              />
            )}

            {/* Snow range band — all-years mode only (renders below the mean area) */}
            {!isYearSpecific && showSnow && (
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
            )}

            {/* Precipitation bar */}
            {showPrecip && (
              <Bar
                yAxisId="left"
                dataKey="precipitation"
                name="Mittlerer Niederschlag (mm)"
                fill={C.precip}
                fillOpacity={0.75}
                barSize={40}
                radius={[2, 2, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleClick(data, 'precip')}
              >
                {!isYearSpecific && (
                  <ErrorBar
                    dataKey="precipError"
                    width={5}
                    strokeWidth={1.5}
                    stroke={C.precipDark}
                    direction="y"
                  />
                )}
              </Bar>
            )}

            {/* Snow cover — filled area + solid line in snow-white */}
            {showSnow && (
              <Area
                yAxisId="right"
                dataKey="snow"
                name="Mittlere Schneebedeckung (%)"
                stroke={C.snow}
                strokeWidth={2.5}
                fill={C.snowFill}
                fillOpacity={1}
                dot={{ r: 5, fill: C.snow, strokeWidth: 0, cursor: 'pointer' }}
                activeDot={{
                  r: 7,
                  cursor: 'pointer',
                  onClick: (_, dp) => handleClick(dp.payload, 'snow'),
                }}
                connectNulls={false}
              />
            )}

            {/* Snow gap line — dashed grey for missing data (year-specific only) */}
            {showSnow && isYearSpecific && (
              <Line
                yAxisId="right"
                dataKey="snowInterp"
                name="_snowInterp"
                stroke={C.snowGap}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                dot={renderInterpDot}
                activeDot={false}
                isAnimationActive={false}
              />
            )}

            <Tooltip content={renderTooltip} />

            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="square"
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: C.textMuted }}
              formatter={value => (value.startsWith('_') ? null : value)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Detail popup ──────────────────────────────────────── */}
      {popup && (
        <div style={{
          marginTop:      10,
          padding:        '9px 14px',
          background:     'rgba(13,17,23,0.88)',
          border:         '1px solid rgba(255,255,255,0.12)',
          borderRadius:   8,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          animation:      'fadeInUp 0.18s ease',
        }}>
          <p style={{
            margin:     0,
            flex:       1,
            fontSize:   13,
            color:      '#e2e8f0',
            lineHeight: 1.5,
          }}>
            {formatDetail(popup)}
          </p>
          <button
            aria-label="Auswahl aufheben"
            onClick={() => onPointClick?.(null)}
            style={{
              flexShrink:  0,
              background:  'transparent',
              border:      'none',
              color:       '#64748b',
              cursor:      'pointer',
              fontSize:    14,
              lineHeight:  1,
              padding:     '2px 4px',
              transition:  'color 0.15s',
            }}
            onMouseEnter={e => (e.target.style.color = '#94a3b8')}
            onMouseLeave={e => (e.target.style.color = '#64748b')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
