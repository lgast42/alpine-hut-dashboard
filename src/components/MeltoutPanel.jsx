import {
  ComposedChart,
  Scatter,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { meltout, winterSweData, metrics } from '../lib/dataset';
import { useLanguage } from '../i18n/LanguageContext';

// Meltout (Ausaperung) panel: three metric tiles, the long-term scatter with
// the pipeline-computed trend segment, and the winter snow storage series.
// Everything shown is a verbatim export value; the only local work is axis
// scaling and label formatting. New charts live here so the fragile
// HydrologicalChart stays untouched (documented Recharts-3 caveat).

const MONO = "'IBM Plex Mono', monospace";

const C = {
  grid:        'rgba(255,255,255,0.07)',
  axis:        'rgba(255,255,255,0.15)',
  textMuted:   '#94a3b8',
  snowgrid:    '#E2E8F0',
  sentinel2:   '#F59E0B',
  trend:       '#f87171',
  swe:         '#3b82f6',
  sweRunning:  '#F59E0B',
  tooltipBg:   'rgba(13,17,23,0.94)',
  tooltipBord: 'rgba(255,255,255,0.12)',
};

// Month starts (day of year) used purely for axis ticks and labels.
const MONTH_TICKS = [
  { doy: 152, key: 'Jun' },
  { doy: 182, key: 'Jul' },
  { doy: 213, key: 'Aug' },
  { doy: 244, key: 'Sep' },
  { doy: 274, key: 'Oct' },
];

function doyDomain() {
  const doys = [
    ...meltout.snowgrid.map(p => p.doy),
    ...meltout.sentinel2.map(p => p.doy),
    ...meltout.trend_line.map(p => p.doy),
  ];
  return [Math.floor(Math.min(...doys) - 6), Math.ceil(Math.max(...doys) + 6)];
}

// ── Shared tooltip for the meltout scatter ─────────────────────
function MeltoutTooltip({ active, payload, lang }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p?.date) return null;
  const label = new Intl.DateTimeFormat(lang === 'de' ? 'de-AT' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(p.date));
  return (
    <div style={{
      background: C.tooltipBg,
      border: `1px solid ${C.tooltipBord}`,
      borderRadius: 6,
      padding: '6px 10px',
      fontSize: 12,
      fontFamily: MONO,
      color: '#e2e8f0',
    }}>
      {label}
    </div>
  );
}

export default function MeltoutPanel() {
  const { lang, t } = useLanguage();

  const locale = lang === 'de' ? 'de-AT' : 'en-GB';
  const nf = (v, digits = 1) =>
    v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const [winFrom, winTo] = meltout.window;
  const trendTile = metrics.meltout_trend;
  const sweTile = metrics.winter_snow_storage;
  const tempTile = metrics.summer_temperature;

  const [doyMin, doyMax] = doyDomain();
  const monthTicks = MONTH_TICKS.filter(m => m.doy >= doyMin && m.doy <= doyMax);

  const decadeTicks = [];
  for (let y = Math.ceil(winFrom / 10) * 10; y <= winTo; y += 10) decadeTicks.push(y);

  const tileData = [
    {
      key: 'trend',
      value: nf(trendTile.value_days_per_decade),
      unit: t('meltout.tiles.trend.unit'),
      label: t('meltout.tiles.trend.label'),
      sub: t('meltout.tiles.trend.sub', { from: trendTile.window[0], to: trendTile.window[1] }),
    },
    {
      key: 'swe',
      value: `${nf(sweTile.change_pct)} %`,
      unit: t('meltout.tiles.swe.unit'),
      label: t('meltout.tiles.swe.label', {
        year: `${sweTile.latest_winter}${sweTile.latest_complete ? '' : '*'}`,
      }),
      sub: t('meltout.tiles.swe.sub', {
        latest: Math.round(sweTile.latest_max_swe_mm),
        ref: Math.round(sweTile.reference_mean_mm),
        from: sweTile.reference_period[0],
        to: sweTile.reference_period[1],
      }),
    },
    {
      key: 'temp',
      value: `+${nf(tempTile.delta_k)} K`,
      unit: t('meltout.tiles.temp.unit'),
      label: t('meltout.tiles.temp.label'),
      sub: t('meltout.tiles.temp.sub', {
        recent: nf(tempTile.recent_mean_c),
        ref: nf(tempTile.reference_mean_c),
        from: tempTile.reference_period[0],
        to: tempTile.reference_period[1],
      }),
    },
  ];

  return (
    <div className="meltout-panel">
      <div className="spring-panel-head">
        <p className="panel-heading spring-panel-title">{t('meltout.title')}</p>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: C.textMuted }}>
        {t('meltout.subtitle', { from: winFrom, to: winTo })}
      </p>

      {/* ── Metric tiles ─────────────────────────────────────── */}
      <div className="metric-tiles">
        {tileData.map(tile => (
          <div key={tile.key} className="metric-tile">
            <p className="metric-tile-value">
              {tile.value}
              {tile.unit && <span className="metric-tile-unit"> {tile.unit}</span>}
            </p>
            <p className="metric-tile-label">{tile.label}</p>
            <p className="metric-tile-sub">{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Meltout scatter with trend segment ───────────────── */}
      <div className="meltout-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={[winFrom - 2, winTo + 2]}
              ticks={decadeTicks}
              tick={{ fill: C.textMuted, fontSize: 11, fontFamily: MONO }}
              axisLine={{ stroke: C.axis }}
              tickLine={false}
              allowDataOverflow
            />
            <YAxis
              dataKey="doy"
              type="number"
              domain={[doyMin, doyMax]}
              ticks={monthTicks.map(m => m.doy)}
              tickFormatter={doy => {
                const m = monthTicks.find(x => x.doy === doy);
                return m ? t(`meltout.axis_months.${m.key}`) : '';
              }}
              tick={{ fill: C.textMuted, fontSize: 11, fontFamily: MONO }}
              axisLine={false}
              tickLine={false}
              allowDataOverflow
              width={52}
            />
            <Tooltip
              content={<MeltoutTooltip lang={lang} />}
              cursor={{ stroke: C.axis, strokeDasharray: '3 3' }}
            />
            {/* Trend segment exactly as exported (same fit as the tile number) */}
            <Line
              data={meltout.trend_line}
              dataKey="doy"
              name={t('meltout.leg_trend', { from: winFrom, to: winTo })}
              stroke={C.trend}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              legendType="line"
              isAnimationActive={false}
              tooltipType="none"
            />
            <Scatter
              data={meltout.snowgrid}
              name={t('meltout.leg_snowgrid')}
              fill={C.snowgrid}
              opacity={0.9}
              isAnimationActive={false}
            />
            <Scatter
              data={meltout.sentinel2}
              name={t('meltout.leg_s2')}
              fill={C.sentinel2}
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ paddingTop: 10, fontSize: 12, color: C.textMuted }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="meltout-rank">{t('meltout.rank')}</p>
      <p className="meltout-note">{t('meltout.context')}</p>

      {/* ── Winter snow storage ──────────────────────────────── */}
      <p className="panel-heading" style={{ marginTop: 18 }}>{t('meltout.swe_title')}</p>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: C.textMuted }}>
        {t('meltout.swe_subtitle', {
          from: winterSweData[0].winter,
          to: winterSweData.at(-1).winter,
        })}
      </p>
      <div className="swe-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={winterSweData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="winter"
              type="number"
              domain={[winterSweData[0].winter - 1, winterSweData.at(-1).winter + 1]}
              ticks={decadeTicks}
              tick={{ fill: C.textMuted, fontSize: 11, fontFamily: MONO }}
              axisLine={{ stroke: C.axis }}
              tickLine={false}
              allowDataOverflow
            />
            <YAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fill: C.textMuted, fontSize: 11, fontFamily: MONO }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <ReferenceLine
              y={sweTile.reference_mean_mm}
              stroke={C.textMuted}
              strokeDasharray="5 4"
              label={{
                value: t('meltout.swe_ref', {
                  from: sweTile.reference_period[0],
                  to: sweTile.reference_period[1],
                }),
                position: 'insideTopRight',
                fill: C.textMuted,
                fontSize: 10,
                fontFamily: MONO,
              }}
            />
            <Bar dataKey="max_swe_mm" barSize={5} isAnimationActive={false}>
              {winterSweData.map(entry => (
                <Cell
                  key={entry.winter}
                  fill={entry.complete ? C.swe : C.sweRunning}
                  fillOpacity={entry.complete ? 0.75 : 1}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="meltout-note">{t('meltout.swe_running_note')}</p>
    </div>
  );
}
