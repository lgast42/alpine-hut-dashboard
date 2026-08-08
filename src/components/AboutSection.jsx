import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { manifest } from '../lib/dataset'

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

          {/* Data sources and licences, straight from the export manifest */}
          <p className="about-sources-heading">{t('side.about.sources')}</p>
          <ul className="about-sources">
            {manifest.sources.map(s => (
              <li key={s.name}>{s.name} · {s.licence}</li>
            ))}
            <li>Mapbox · Terms of Service</li>
            <li>OpenStreetMap · ODbL</li>
          </ul>

          {/* Every shown number is traceable to this pipeline state */}
          <p className="about-provenance">
            {t('side.about.provenance', {
              contract: manifest.contract_version,
              version: manifest.pipeline_version,
              commit: manifest.pipeline_commit,
            })}
          </p>

          <p className="about-footer">{t('side.about.footer')}</p>
        </div>
      )}
    </div>
  )
}
