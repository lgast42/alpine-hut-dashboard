# Wassermonitoring Alpine Schutzhütten

Dashboard zur Wasserversorgung alpiner Schutzhütten. Standort Neue Prager Hütte.

Live: https://lgast42.github.io/alpine-hut-dashboard/

Die Anwendung zeigt offene Fernerkundungs- und Klimadaten. Vor Ort erhobene
Messwerte sind nicht enthalten.

## Setup

```bash
npm install
cp .env.example .env   # Mapbox Public Token eintragen
npm run dev
```

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Build nach `dist/` |
| `npm run lint` | ESLint |
| `npm run deploy` | Build und Veröffentlichung auf `gh-pages` |

## Datenquellen

| Quelle | Lizenz |
|---|---|
| Copernicus Sentinel-2 (ESA) | Copernicus Open Licence |
| GeoSphere Austria SPARTACUS | CC BY 4.0 |
| GeoSphere Austria SNOWGRID-CL | CC BY 4.0 |
| Mapbox | Terms of Service |
| OpenStreetMap | ODbL |

## Rechte

© 2026 Lucas Gasthauer. Alle Rechte vorbehalten.
Für die angezeigten Daten gilt die Lizenz der jeweiligen Quelle.
