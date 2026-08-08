import { useMemo, useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  ScatterChart,
  Scatter,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ErrorBar,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import {
  monthlyAverages,
  varianceData,
  annualData,
  sceneData,
  dailyPrecipData,
  dataYears,
  climatologyWindow,
  isRunningSeason,
} from '../lib/dataset';
import { useLanguage } from '../i18n/LanguageContext';

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
  vulnFill:    'rgba(252,165,165,0.12)',
  vulnStroke:  'rgba(248,113,113,0.40)',
  vulnLabel:   '#fca5a5',
  tooltipBg:   'rgba(13,17,23,0.94)',
  tooltipBord: 'rgba(255,255,255,0.12)',
};

// English month keys used throughout — translated in the tick formatters
const MONTH_NUM   = { May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09' };
const MONTH_KEYS  = { May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'aug', Sep: 'sep' };
const MONTH_ORDER = ['May', 'Jun', 'Jul', 'Aug', 'Sep'];

// ── Individual-view constants ──────────────────────────────────
const YEAR_COLORS = {
  2018: '#9ca3af',  // slate grey
  2019: '#f97316',  // orange
  2020: '#10b981',  // emerald
  2021: '#a3e635',  // lime
  2022: '#ef4444',  // red
  2023: '#c084fc',  // purple
  2024: '#fbbf24',  // amber
  2025: '#ec4899',  // pink
  2026: '#38bdf8',  // sky blue
};

// Years come from the export; a year without an assigned color falls back
// to neutral grey so a new season never breaks the chart.
const YEARS = dataYears.map(year => ({
  year,
  color: YEAR_COLORS[year] ?? '#94a3b8',
}));

// English month keys — translated at render time via t('months.key')
const MONTH_STARTS = [
  { doy: 121, label: 'May' },
  { doy: 152, label: 'Jun' },
  { doy: 182, label: 'Jul' },
  { doy: 213, label: 'Aug' },
  { doy: 244, label: 'Sep' },
];

// Returns the English month key for a given DOY (used in tick formatters)
function doyToLabel(doy) {
  for (let i = MONTH_STARTS.length - 1; i >= 0; i--) {
    if (doy >= MONTH_STARTS[i].doy) return MONTH_STARTS[i].label;
  }
  return '';
}

// Pre-split daily precip and snow scenes by year for performance
const PRECIP_BY_YEAR = Object.fromEntries(
  YEARS.map(({ year }) => [year, dailyPrecipData.filter(d => d.year === year)])
);
const SNOW_BY_YEAR = Object.fromEntries(
  YEARS.map(({ year }) => [year, sceneData.filter(d => d.year === year)])
);

// ── PrecipBars — direct child of ScatterChart (Recharts 3 hook API) ───────────
// Renders daily precipitation as vertical bars using the chart's own axis scales.
// Must be a named React component so hooks (useXAxisScale / useYAxisScale) work.
function PrecipBars({ precipData, color, fillOpacity = 0.72, onBarClick }) {
  const xScale = useXAxisScale(0);       // ScatterChart xAxisId defaults to 0
  const yScale = useYAxisScale('left');  // matches yAxisId="left" + allowDataOverflow on the YAxis
  if (!xScale || !yScale || !precipData.length) return null;
  const y0 = yScale(0);
  return (
    <g className="precip-bars">
      {precipData.map((d) => {
        const cx = xScale(d.doy);
        const cy = yScale(d.value);
        const h  = y0 - cy;
        if (h < 1) return null;
        return (
          <rect
            key={d.date}
            x={cx - 2}
            y={cy}
            width={4}
            height={h}
            fill={color}
            fillOpacity={fillOpacity}
            rx={1}
            onClick={onBarClick ? () => onBarClick(d) : undefined}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
          />
        );
      })}
    </g>
  );
}

/** Captures the current X-axis scale into a ref so the chart-level onClick
 *  handler can convert pixel positions to DOY values for precipitation-bar detection.
 *  Must be a named component to use Recharts 3 hooks correctly. The ref is
 *  written in an effect (not during render); click handlers only read it
 *  after mount, so the one-render delay is irrelevant. */
function IndividualXScaleCapture({ xScaleRef }) {
  const xScale = useXAxisScale(0);
  useEffect(() => { xScaleRef.current = xScale; });
  return null;
}

// ── Data helpers ───────────────────────────────────────────────

function getScenesCount(month, year) {
  return sceneData.filter(s => {
    if (s.date.slice(5, 7) !== MONTH_NUM[month]) return false;
    return year === 'all' || s.year === year;
  }).length;
}

/**
 * Build the array Recharts will consume.
 * 'all'          → pipeline climatology: monthly means + spread band + error bars
 * specific year  → exact monthly values; missing months stay null (gap)
 */
function buildChartData(selectedYear) {
  if (selectedYear === 'all') {
    return monthlyAverages.map((m, i) => ({
      month:         m.month,
      precipitation: m.precipitation,
      snow:          m.snow,
      // ErrorBar takes offsets relative to the mean; the rendered whisker
      // ends are exactly the exported min/max, nothing new is shown.
      precipError:   [m.precipitation - varianceData[i].precipMin, varianceData[i].precipMax - m.precipitation],
      snowRange:     [varianceData[i].snowMin, varianceData[i].snowMax],
      precipMin:     varianceData[i].precipMin,
      precipMax:     varianceData[i].precipMax,
      scenesCount:   getScenesCount(m.month, 'all'),
    }));
  }

  const entry = annualData.find(d => d.year === selectedYear);
  return MONTH_ORDER.map(month => {
    const m = entry?.months[MONTH_KEYS[month]];
    return {
      month,
      precipitation: m?.precip ?? null,
      snow:          m?.snow   ?? null,
      precipError:   null,
      snowRange:     null,
      precipMin:     null,
      precipMax:     null,
      scenesCount:   getScenesCount(month, selectedYear),
    };
  });
}

/** Builds the detail popup text string. Accepts t() so it is language-aware. */
function formatDetail(d, t) {
  if (!d) return '';
  const noData = t('detail.no_data');
  if (d.source === 'hydro-individual') {
    if (d.type === 'precip') {
      const val = d.value != null ? `${d.value.toFixed(1)} mm` : noData;
      return `${d.date}: ${t('detail.precip_label')} ${val} · ${t('detail.precip_source')}`;
    }
    const val = d.fsca != null ? `${d.fsca.toFixed(1)} %` : noData;
    return `${d.date}: ${t('detail.snow_label')} ${val} · ${t('detail.snow_source')}`;
  }
  const yearStr  = d.year === 'all'
    ? `${climatologyWindow[0]}–${climatologyWindow[1]}`
    : String(d.year);
  const monthStr = t(`months.${d.month}_full`);
  const n        = d.scenesCount;
  const scLabel  = `${n} ${n === 1 ? t('detail.scene') : t('detail.scenes')}`;
  if (d.type === 'snow') {
    const val = d.value != null ? `${Number(d.value).toFixed(1)} %` : noData;
    return `${monthStr} ${yearStr}: fSCA ${val} · ${t('detail.from')} ${scLabel}`;
  }
  const val = d.value != null ? `${d.value} mm` : noData;
  return `${monthStr} ${yearStr}: ${t('detail.precip_label')} ${val} · ${t('detail.precip_source')}`;
}

// ── Component ──────────────────────────────────────────────────
export default function HydrologicalChart({
  activeCategory      = 'combined',
  selectedYear        = 'all',
  activeDataDetail    = null,
  temporalResolution  = 'monthly',
  onPointClick,
}) {
  const { t } = useLanguage();
  const chartData = useMemo(() => buildChartData(selectedYear), [selectedYear]);

  // ── Mobile breakpoint ────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handle = e => setIsMobile(e.matches);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);

  // Refs for click coordination (no re-render overhead needed)
  const xScaleRef      = useRef(null);  // X-scale for DOY ↔ pixel in individual view
  const justClickedRef = useRef(false); // true when a series element was just clicked

  const showSnow       = activeCategory !== 'precip';
  const showPrecip     = activeCategory !== 'snow';
  const isYearSpecific = selectedYear !== 'all';

  // ── Click handler ────────────────────────────────────────────
  function handleClick(data, type) {
    if (!onPointClick || !data) return;
    justClickedRef.current = true; // prevent chart-level onClick from clearing popup
    // Toggle: re-clicking the same point clears the popup
    if (
      activeDataDetail?.source === 'hydro-chart' &&
      activeDataDetail?.month  === data.month &&
      activeDataDetail?.type   === type &&
      activeDataDetail?.year   === selectedYear
    ) { onPointClick(null); return; }
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

  const popup = (activeDataDetail?.source === 'hydro-chart' || activeDataDetail?.source === 'hydro-individual')
    ? activeDataDetail
    : null;

  // ── Individual-view chart ────────────────────────────────────
  // Always single-year (App enforces: Einzelwerte ↔ "Alle" are mutually exclusive).
  function renderIndividualChart() {
    const snowColor  = C.snow;
    const refAxisId  = showPrecip ? 'left' : 'right';

    // Precipitation: non-zero days only, always blue regardless of year
    const precipData = (PRECIP_BY_YEAR[selectedYear] ?? []).filter(d => d.value > 0);
    // Snow: Sentinel-2 scenes for the selected year, year-specific color.
    // Periods without scenes stay empty — gaps are shown, not filled.
    const snowData = SNOW_BY_YEAR[selectedYear] ?? [];

    const chartMargin = isMobile
      ? { top: 10, right: 5, bottom: 0, left: 6 }
      : { top: 10, right: showSnow ? 48 : 24, bottom: 8, left: showPrecip ? 48 : 8 };

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={chartMargin}
          onClick={(data) => {
            // If a series element (snow scatter) just fired its own onClick, skip
            if (justClickedRef.current) { justClickedRef.current = false; return; }

            // Try coordinate-based precipitation-bar detection
            const chartX = data?.chartX;
            if (showPrecip && precipData.length && chartX != null && xScaleRef.current) {
              // Find the closest bar whose center is within ±5 px of the click
              const bar = precipData.reduce((best, d) => {
                const dist = Math.abs(xScaleRef.current(d.doy) - chartX);
                return (!best || dist < Math.abs(xScaleRef.current(best.doy) - chartX)) ? d : best;
              }, null);
              if (bar && Math.abs(xScaleRef.current(bar.doy) - chartX) <= 5) {
                const isSame = activeDataDetail?.source === 'hydro-individual' &&
                  activeDataDetail?.type === 'precip' && activeDataDetail?.date === bar.date;
                onPointClick?.(isSame ? null : {
                  source: 'hydro-individual', type: 'precip',
                  date: bar.date, doy: bar.doy, year: bar.year, value: bar.value,
                });
                return;
              }
            }

            // Empty-area click → clear popup
            onPointClick?.(null);
          }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />

          {MONTH_STARTS.map(({ doy, label }) => (
            <ReferenceLine
              key={label}
              x={doy}
              yAxisId={refAxisId}
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="3 3"
            />
          ))}

          {/* allowDataOverflow: ensures the explicit domain [118,275] is honoured
              even when no Scatter series carries real data (e.g. "Nied." mode). */}
          <XAxis
            dataKey="doy"
            type="number"
            domain={[118, 275]}
            allowDataOverflow
            ticks={MONTH_STARTS.map(m => m.doy + 15)}
            tickFormatter={v => {
              const key = doyToLabel(v + 5);
              const label = t(`months.${key}`);
              return isMobile ? label[0] : label;
            }}
            tick={{ fill: C.textMuted, fontSize: isMobile ? 10 : 12, fontFamily: MONO }}
            axisLine={{ stroke: C.axis }}
            tickLine={false}
            name="DOY"
          />

          {/* Left axis — precipitation mm, always blue.
              allowDataOverflow is required so Recharts honours domain={[0,90]}
              even when the precipitation Scatter carries no data points. */}
          {showPrecip && (
            <YAxis
              yAxisId="left"
              dataKey="value"
              type="number"
              domain={[0, 90]}
              allowDataOverflow
              tickCount={isMobile ? 4 : 6}
              width={isMobile ? 28 : undefined}
              tick={{ fill: C.precip, fontSize: isMobile ? 10 : 11, fontFamily: MONO }}
              axisLine={false}
              tickLine={false}
              label={isMobile ? undefined : {
                value: t('chart.precip_axis'),
                angle: -90,
                position: 'insideLeft',
                offset: -32,
                style: { fill: C.precip, fontSize: 11, fontFamily: MONO },
              }}
              name="mm"
            />
          )}

          {/* Right axis — snow cover %, year color.
              allowDataOverflow ensures the explicit domain=[0,100] is honoured
              even when snowData is empty (no scenes for the selected year). */}
          {showSnow && (
            <YAxis
              yAxisId="right"
              orientation="right"
              dataKey="fsca"
              type="number"
              domain={[0, 100]}
              allowDataOverflow
              tickCount={isMobile ? 4 : 6}
              width={isMobile ? 28 : undefined}
              tick={{ fill: snowColor, fontSize: isMobile ? 10 : 11, fontFamily: MONO }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              label={isMobile ? undefined : {
                value: t('chart.snow_axis'),
                angle: 90,
                position: 'insideRight',
                offset: -32,
                style: { fill: snowColor, fontSize: 11, fontFamily: MONO },
              }}
              name="fSCA"
            />
          )}

          {/* Daily precipitation — always blue vertical bars (non-zero days only).
              PrecipBars is a named React component so it can use Recharts 3 hooks
              (useXAxisScale / useYAxisScale) which must be called inside a component. */}
          {showPrecip && (
            <PrecipBars precipData={precipData} color={C.precip} />
          )}
          {/* Invisible Scatter keeps "Niederschlag (mm)" in the Legend */}
          {showPrecip && (
            <Scatter
              yAxisId="left"
              name={t('chart.leg_precip_ind')}
              data={[]}
              fill={C.precip}
              isAnimationActive={false}
            />
          )}

          {/* Sentinel-2 snow scenes — year color, connected line shows seasonal trend */}
          {showSnow && (
            <Scatter
              yAxisId="right"
              name={t('chart.leg_snow_ind')}
              data={snowData}
              fill={snowColor}
              opacity={0.9}
              r={5}
              line={{ stroke: snowColor, strokeWidth: 2, strokeOpacity: 0.7 }}
              lineType="joint"
              onClick={(d) => {
                justClickedRef.current = true;
                const isSame = activeDataDetail?.source === 'hydro-individual' &&
                  activeDataDetail?.type === 'snow' && activeDataDetail?.date === d.date;
                if (isSame) { onPointClick?.(null); return; }
                onPointClick?.({ source: 'hydro-individual', type: 'snow',
                  date: d.date, doy: d.doy, year: d.year, fsca: d.fsca });
              }}
            />
          )}

          {/* Captures the x-scale so chart-level onClick can convert pixels → DOY */}
          <IndividualXScaleCapture xScaleRef={xScaleRef} />

          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ paddingTop: 14, fontSize: isMobile ? 11 : 13, color: C.textMuted }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  const isIndividual = temporalResolution === 'individual';

  // Subtitle for the chart description paragraph. A running season is
  // marked as such (Handoff: 2026 must be visibly "laufend").
  const yearLabel = isRunningSeason(selectedYear)
    ? `${selectedYear} (${t('panel.running')})`
    : selectedYear;
  let subtitle;
  if (isIndividual) {
    if (activeCategory === 'snow')   subtitle = t('chart.sub_ind_snow',     { year: yearLabel });
    else if (activeCategory === 'precip') subtitle = t('chart.sub_ind_precip', { year: yearLabel });
    else                             subtitle = t('chart.sub_ind_combined', { year: yearLabel });
  } else {
    subtitle = isYearSpecific
      ? t('chart.sub_year', { year: yearLabel })
      : t('chart.sub_all', { from: climatologyWindow[0], to: climatologyWindow[1] });
  }

  return (
    <div className="hydrological-chart">
      <p style={{ margin: '0 0 10px', fontSize: 13, color: C.textMuted }}>
        {subtitle}
      </p>

      <div className="hydro-chart-wrap">
        {isIndividual
          ? renderIndividualChart()
          : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={isMobile
              ? { top: 10, right: 5, bottom: 0, left: 6 }
              : { top: 10, right: 48, bottom: 8, left: 48 }}
            onClick={() => {
              if (justClickedRef.current) { justClickedRef.current = false; return; }
              onPointClick?.(null);
            }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fill: C.textMuted, fontSize: isMobile ? 10 : 12, fontFamily: MONO }}
              axisLine={{ stroke: C.axis }}
              tickLine={false}
              tickFormatter={v => {
                const label = t(`months.${v}`);
                return isMobile ? label[0] : label;
              }}
            />

            {/* Left axis: Precipitation */}
            {showPrecip && (
              <YAxis
                yAxisId="left"
                domain={[0, 500]}
                tickCount={isMobile ? 4 : 6}
                width={isMobile ? 28 : undefined}
                tick={{ fill: C.precip, fontSize: isMobile ? 10 : 11, fontFamily: MONO }}
                axisLine={false}
                tickLine={false}
                label={isMobile ? undefined : {
                  value: t('chart.precip_axis'),
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
                tickCount={isMobile ? 4 : 6}
                width={isMobile ? 28 : undefined}
                tick={{ fill: C.snow, fontSize: isMobile ? 10 : 11, fontFamily: MONO }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                label={isMobile ? undefined : {
                  value: t('chart.snow_axis'),
                  angle: 90,
                  position: 'insideRight',
                  offset: -32,
                  style: { fill: C.snow, fontSize: 11, fontFamily: MONO },
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
                name={t('chart.leg_precip')}
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
                name={t('chart.leg_snow')}
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

            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="square"
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: C.textMuted }}
              formatter={value => (value.startsWith('_') ? null : value)}
            />
          </ComposedChart>
        </ResponsiveContainer>
          )}
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
            {formatDetail(popup, t)}
          </p>
          <button
            aria-label={t('panel.clear')}
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
