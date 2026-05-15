# Jet Lag Map Companion

Live map annotations for Jet Lag Hide & Seek. The app is a Vite + React PWA with Leaflet, Zustand persistence, and optional Firebase sync.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the Firebase `VITE_*` values.
2. Install dependencies with `npm install`.
3. Start the dev server with `npm run dev`.

Optional transit overlays need `VITE_TRANSIT_PROXY_URL` pointing at the deployed Firebase `vehicles` function, plus `VITE_TRANSITLAND_API_KEY` for static route data.

## Quality checks

- `npm run lint`
- `npm run typecheck`
- `npm test`

## Production deploy

`npm run deploy` runs lint, tests, a production build with validated env, installs Cloud Functions dependencies, then deploys hosting, Firestore rules/indexes, and functions to the default project in `.firebaserc`.

Set production Firebase values in `.env.production.local` or `.env.local` before deploying. After deploy, confirm `VITE_TRANSIT_PROXY_URL` in your production env matches the live `vehicles` function URL.
