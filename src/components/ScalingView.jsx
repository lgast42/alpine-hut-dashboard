export default function ScalingView() {
  const cards = [
    { emoji: '⛰️', title: 'Automatisierte Einzugsgebietsmodellierung' },
    { emoji: '📊', title: 'Standortübergreifende Resilienzanalyse' },
    { emoji: '🌡️', title: 'CMIP6-Klimaprojektionen bis 2050' },
  ]

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2D3748', margin: '0 0 8px' }}>
        Skalierung auf weitere Standorte
      </h3>
      <p style={{ fontSize: 13, color: '#718096', margin: '0 0 24px', maxWidth: 640 }}>
        Der hier gezeigte Workflow ist so konzipiert, dass er auf weitere alpine Schutzhütten
        übertragen werden kann. Eine vergleichende Analyse mehrerer Standorte ist in Vorbereitung.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {cards.map(card => (
          <div key={card.title} style={{
            flex: '1 1 200px',
            background: '#F7FAFC',
            border: '1.5px dashed #CBD5E0',
            borderRadius: 8,
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 28 }}>{card.emoji}</span>
            <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500, lineHeight: 1.4 }}>
              {card.title}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#A0AEC0', fontStyle: 'italic', margin: '24px 0 0' }}>
        Kontakt: Lucas Gasthauer · Universität Innsbruck · Institut für Geographie
      </p>
    </div>
  )
}
