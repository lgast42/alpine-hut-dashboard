import { useState } from 'react'
import ScalingView from '../components/ScalingView'

function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <section className="about-section">
      <div className="about-inner">
        <button
          className={`about-toggle${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          Über dieses Projekt <span className="about-arrow">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="about-content">
            <p>Die Wasserversorgung alpiner Schutzhütten wandelt sich von einem glazial gepufferten zu einem niederschlagsabhängigen System. Dieser Übergang betrifft nicht einzelne Standorte, sondern das alpine Stützpunktnetz insgesamt. Das vorliegende Dashboard demonstriert einen fernerkundungsbasierten Analyse-Workflow, der auf frei verfügbaren Geodaten aufbaut und die hydrologische Resilienz einzelner Hüttenstandorte quantitativ bewertet. Die Pilotanalyse an der Neuen Prager Hütte (2796 m) zeigt, wie Einzugsgebietsmodellierung, Schneebedeckungsanalyse und Niederschlagsdaten zu einem standortspezifischen Versorgungsprofil zusammengeführt werden können. Die Methodik ist auf weitere Standorte übertragbar und soll Alpenvereinen eine objektive Grundlage für die Priorisierung von Infrastrukturinvestitionen liefern.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function InfoView() {
  return (
    <>
      <section className="scaling-section">
        <ScalingView />
      </section>

      <AboutSection />

      <footer className="dashboard-footer">
        <div>
          <h4>Datenquellen</h4>
          <p>Schneebedeckung: Sentinel-2 L2A (ESA/Copernicus)</p>
          <p>Niederschlag: SPARTACUS v2.1 (GeoSphere Austria), 1 km Gitter</p>
          <p>Geländemodell: DGM 0,5 m (Land Tirol / tiris)</p>
        </div>
        <div>
          <h4>Methodik</h4>
          <p>Einzugsgebiet: hydrologische Modellierung</p>
          <p>Validierung: gegen Referenzkartierung geprueft</p>
          <p>Zeitraum: Bewirtschaftungssaison Mai–September, 2018–2025</p>
        </div>
        <div>
          <h4>Ersteller</h4>
          <p>Lucas Gasthauer · B.Sc. Geographie</p>
          <p>Universität Innsbruck · Institut für Geographie</p>
          <p>Kontakt: lucas.gasthauer@student.uibk.ac.at</p>
        </div>
      </footer>
    </>
  )
}
