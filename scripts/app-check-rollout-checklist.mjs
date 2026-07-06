import { resolve } from "node:path";

const projectId = "jet-lag-map-companion";
const consoleBase = `https://console.firebase.google.com/project/${projectId}/appcheck`;

console.log(`App Check monitoring and enforcement checklist

Prerequisites (do first):
  1. npm run print:cloudflare-app-check-env
  2. Set the variable in Cloudflare Pages and redeploy the frontend
  3. npm run verify:app-check  → production bundle should include the site key

Monitoring period (2–7 days after production ships tokens):
  Metrics: ${consoleBase}/metrics
  - Firestore: verified requests should climb; unverified should shrink
  - Cloud Functions: same for grantAccess traffic
  - Investigate before enforcing if a large share stays unverified

Enforcement (only after metrics look healthy):
  ${consoleBase}/apis
  - Cloud Firestore → Enforce
  - Cloud Functions → Enforce

grantAccess already has enforceAppCheck: true in code (deployed). Until the
production frontend initializes App Check, premium access-code redemption may
fail — set the Cloudflare env var and redeploy as soon as possible.

Local dev against production Firebase (not emulators):
  - npm run dev with VITE_FIREBASE_APP_CHECK_SITE_KEY in .env.local
  - Copy the debug token from the browser console
  - ${consoleBase}/apps → jetlag-web → Manage debug tokens → register it
  - Or set VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN to a pre-registered token
`);
