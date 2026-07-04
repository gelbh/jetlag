# Jet Lag Map Companion

Live map annotations for Jet Lag Hide & Seek. The app is a Vite + React PWA with Leaflet, Zustand persistence, and optional Firebase sync.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the Firebase `VITE_*` values.
2. Install dependencies with `npm install`.
3. Start the dev server with `npm run dev`.

Optional transit overlays need `VITE_TRANSIT_PROXY_URL` pointing at the deployed Firebase `vehicles` function, plus `VITE_TRANSITLAND_API_KEY` for static route data.

Optional Overpass geographic data goes through the Firebase `overpass` function when `VITE_OVERPASS_PROXY_URL` is set (recommended — reduces rate limits on public instances). Both proxies require the Firebase **Blaze** plan (pay-as-you-go; free tier covers infrequent use).

## Quality checks

- `npm run lint`
- `npm run typecheck`
- `npm test`

## Production deploy

The frontend deploys from GitHub to Cloudflare Pages (`jetlag.gelbhart.dev`) on pushes to `main`. Set the `VITE_*` build variables in the Cloudflare Pages project settings.

`npm run deploy` runs lint, tests, installs Cloud Functions dependencies, then deploys Firestore rules/indexes and Cloud Functions to the default project in `.firebaserc`. On success it prints the function URLs to set as `VITE_*` build variables.

**Overpass proxy setup:**

1. Upgrade the Firebase project to Blaze (Console → Usage and billing → Modify plan).
2. Run `npm run deploy` and copy the printed `VITE_OVERPASS_PROXY_URL`.
3. Add it to Cloudflare Pages environment variables and redeploy the frontend (or set in `.env.local` for local dev).

Confirm `VITE_TRANSIT_PROXY_URL` in Cloudflare matches the live `vehicles` function URL when using transit overlays.
