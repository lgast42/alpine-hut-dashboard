# Wassermonitoring Alpine Schutzhütten

Interaktives Dashboard zur Wasserversorgung alpiner Schutzhütten. Pilotstandort Neue Prager Hütte, Hohe Tauern.

**Live:** https://lgast42.github.io/alpine-hut-dashboard/

## Setup

```bash
npm install
npm run dev
```

Benötigt eine `.env` im Projektstamm mit einem Mapbox Access Token:

```
VITE_MAPBOX_TOKEN=
```

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build nach `dist/` |
| `npm run lint` | ESLint |

## Datengrundlage

Copernicus Sentinel-2 (ESA), SPARTACUS und SNOWGRID (GeoSphere Austria), Kartengrundlage Mapbox und OpenStreetMap.

## Rechte

© Lucas Gasthauer, Universität Innsbruck, in Kooperation mit dem Deutschen Alpenverein. Alle Rechte vorbehalten. Keine Nutzung oder Weiterverwendung ohne Rücksprache.
