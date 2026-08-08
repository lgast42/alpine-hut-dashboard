import { useLanguage } from '../i18n/LanguageContext'

/**
 * Fact sheet for sites without published time series (currently the
 * Richterhütte). The facts come from the site assessment report and are
 * static content with a visible source line — no series, no invented
 * numbers. Time series appear only once the pipeline exports them.
 */
const FACT_KEYS = ['elevation', 'catchment', 'springflow', 'storage', 'park']

export default function SiteProfilePanel() {
  const { t } = useLanguage()

  return (
    <div className="site-profile">
      <div className="spring-panel-head">
        <p className="panel-heading spring-panel-title">{t('siteProfile.title')}</p>
        <span className="spring-badge">{t('siteProfile.status')}</span>
      </div>

      <p className="spring-text">{t('siteProfile.intro')}</p>

      <dl className="site-facts">
        {FACT_KEYS.map(k => (
          <div key={k} className="site-fact">
            <dt>{t(`siteProfile.facts.${k}.label`)}</dt>
            <dd>{t(`siteProfile.facts.${k}.value`)}</dd>
          </div>
        ))}
      </dl>

      <p className="spring-note">{t('siteProfile.source')}</p>
    </div>
  )
}
