import { useLanguage } from '../i18n/LanguageContext'

/**
 * Placeholder panel for the spring-flow category.
 *
 * Deliberately shows no numbers: the spring has been monitored continuously
 * since June 2026, but publication of the measurements is not cleared. When
 * it is, the pipeline export gains a module and this component receives it
 * via the `data` prop — until then the empty state renders, unmistakably
 * marked as "no measurement shown". No invented curves, ever.
 */
export default function SpringFlowPanel({ data = null }) {
  const { t } = useLanguage()

  // Future: render the real chart once an export module is wired up.
  // Kept explicit so the slot is visible in the code.
  if (data != null) {
    return null
  }

  return (
    <div className="spring-panel">
      <div className="spring-panel-head">
        <p className="panel-heading spring-panel-title">{t('spring.title')}</p>
        <span className="spring-badge">{t('spring.status')}</span>
      </div>

      <p className="spring-text">{t('spring.paragraph')}</p>

      <div className="spring-empty" role="img" aria-label={t('spring.empty')}>
        <svg width="46" height="58" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <path
            d="M16 3 C16 3 5 17 5 25 a11 11 0 0 0 22 0 C27 17 16 3 16 3 Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        </svg>
        <span className="spring-empty-label">{t('spring.empty')}</span>
      </div>

      <p className="spring-note">{t('spring.note')}</p>
    </div>
  )
}
