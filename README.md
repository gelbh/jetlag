# Jet Lag Map Companion

Live map annotations for Jet Lag Hide & Seek. The app is a Vite + React PWA with Leaflet, Zustand persistence, and optional Firebase sync.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the Firebase `VITE_*` values.
2. Install dependencies with `npm install`.
3. Start the dev server with `npm run dev`.

## Session tiers

When creating a session (with Firebase configured), choose **Free** or **Premium**:

| Tier | What you get | Cost to host |
|------|----------------|--------------|
| **Free** | All map tools, team sync, static transit, public Overpass/Nominatim | Firestore only (light) |
| **Premium** | Everything in Free, plus live transit and Firebase API proxies | Blaze function usage |

- **Free** is the default — anyone can create one without a password.
- **Premium** prompts the host for a one-time access code (shared with friends you trust).
- Joiners always use the normal 4-letter game code; they never see the access code.

## Premium setup (host)

1. Upgrade the Firebase project to **Blaze** (Console → Usage and billing).
2. Set function secrets (one-time):
   ```bash
   firebase functions:secrets:set ACCESS_CODE
   firebase functions:secrets:set TRANSITLAND_API_KEY
   ```
3. Run `npm run deploy` and copy the printed proxy URLs into Cloudflare Pages / `.env.local`:
   - `VITE_OVERPASS_PROXY_URL`
   - `VITE_TRANSIT_PROXY_URL` (London live vehicles)
   - `VITE_TRANSITLAND_PROXY_URL` (other metros)
4. Optional: enable **App Check** with `VITE_FIREBASE_APP_CHECK_SITE_KEY` (reCAPTCHA v3 in Firebase Console → App Check).

Share the access code out-of-band with co-hosts who should be able to create Premium sessions.

## Quality checks

- `npm run lint`
- `npm run typecheck`
- `npm test` — Vitest unit/integration suite
- `npm run test:coverage` — Vitest with coverage thresholds
- `npm run test:functions` — Firebase Cloud Functions tests
- `npm run test:emulator` — Firestore/auth emulator integration tests (requires `firebase emulators:exec` or running emulators locally)
- `npm run test:e2e` — Playwright browser flows
- `npm run test:all` — Vitest + Functions (also runs in Husky pre-commit and `npm run deploy`)

See [``]() for manual flaky-network checks and the automated tests that cover each scenario.

## Production deploy

The frontend deploys from GitHub to Cloudflare Pages (`jetlag.gelbhart.dev`) on pushes to `main`. Set the `VITE_*` build variables in the Cloudflare Pages project settings.

`npm run deploy` runs lint, tests, installs Cloud Functions dependencies, then deploys Firestore rules/indexes and Cloud Functions to the default project in `.firebaserc`. On success it prints the function URLs to set as `VITE_*` build variables.

Deploy order after changing access rules: functions + Firestore rules first, then frontend (so auth headers are sent).
