import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Reusable "About this project" accordion.
 * Used in two places:
 *   1. Desktop sidepanel (always rendered, inside .sidepanel-about wrapper)
 *   2. Mobile data-panel footer (inside .about-in-datapanel, hidden ≥768px via CSS)
 * Each instance carries its own independent open/close state.
 */
export default function AboutSection() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className={`about-accordion ${open ? 'open' : ''}`}>
      <button className="about-toggle" onClick={() => setOpen(v => !v)}>
        <span>{t('side.about.heading')}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="about-text">
          <p>{t('side.about.paragraph1')}</p>
          <p>{t('side.about.paragraph2')}</p>
          <p className="about-footer">{t('side.about.footer')}</p>
        </div>
      )}
    </div>
  )
}
