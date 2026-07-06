import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envLocalPath = resolve(import.meta.dirname, "..", ".env.local");

if (!existsSync(envLocalPath)) {
  console.error("Missing .env.local — copy .env.example and set VITE_FIREBASE_APP_CHECK_SITE_KEY.");
  process.exit(1);
}

const siteKey = readFileSync(envLocalPath, "utf8")
  .match(/^VITE_FIREBASE_APP_CHECK_SITE_KEY=(.*)$/m)?.[1]
  ?.trim();

if (!siteKey) {
  console.error("VITE_FIREBASE_APP_CHECK_SITE_KEY is not set in .env.local.");
  process.exit(1);
}

console.log(`Cloudflare Pages → jetlag → Settings → Environment variables

Add (Production + Preview):
  Name:  VITE_FIREBASE_APP_CHECK_SITE_KEY
  Value: ${siteKey}

Then trigger a new deployment (Deployments → Retry deployment, or push a commit).

Verify after deploy:
  npm run verify:app-check
`);
