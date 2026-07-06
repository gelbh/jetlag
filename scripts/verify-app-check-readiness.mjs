import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const envLocalPath = resolve(projectRoot, ".env.local");
const functionsIndexPath = resolve(projectRoot, "functions/index.mjs");

function readEnvValue(name) {
  if (!existsSync(envLocalPath)) {
    return null;
  }

  const match = readFileSync(envLocalPath, "utf8").match(
    new RegExp(`^${name}=(.*)$`, "m"),
  );
  return match?.[1]?.trim() || null;
}

function checkGrantAccessEnforcement() {
  const source = readFileSync(functionsIndexPath, "utf8");
  return /enforceAppCheck:\s*true/.test(source);
}

function collectProductionAssetPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
    paths.add(match[1]);
  }
  return [...paths];
}

async function productionIncludesSiteKey(siteKey) {
  const html = await fetch("https://jetlag.gelbhart.dev").then((response) =>
    response.text(),
  );
  const assetPaths = collectProductionAssetPaths(html);
  if (assetPaths.length === 0) {
    return { found: false, chunk: null };
  }

  for (const assetPath of assetPaths) {
    const bundle = await fetch(`https://jetlag.gelbhart.dev${assetPath}`).then(
      (response) => response.text(),
    );
    if (siteKey && bundle.includes(siteKey)) {
      return { found: true, chunk: assetPath };
    }
  }

  return { found: false, chunk: null };
}

const siteKey = readEnvValue("VITE_FIREBASE_APP_CHECK_SITE_KEY");
const grantAccessEnforced = checkGrantAccessEnforcement();

console.log("App Check readiness\n");
console.log(
  siteKey
    ? `  Local site key: set (${siteKey.slice(0, 8)}…)`
    : "  Local site key: missing — add VITE_FIREBASE_APP_CHECK_SITE_KEY to .env.local",
);
console.log(
  grantAccessEnforced
    ? "  grantAccess enforceAppCheck: true (in functions/index.mjs)"
    : "  grantAccess enforceAppCheck: not enabled",
);

let productionCheck = { found: false, chunk: null };
try {
  productionCheck = siteKey
    ? await productionIncludesSiteKey(siteKey)
    : { found: false, chunk: null };
} catch (error) {
  console.log(`  Production check: failed (${error.message})`);
}

if (productionCheck.found) {
  console.log(
    `  Production bundle: App Check site key present (${productionCheck.chunk})`,
  );
} else if (siteKey) {
  console.log(
    "  Production bundle: App Check site key not found in any /assets/*.js chunk — set VITE_FIREBASE_APP_CHECK_SITE_KEY in Cloudflare Pages and redeploy",
  );
} else {
  console.log("  Production bundle: skipped (no local site key to compare)");
}

console.log(`
Manual steps before enforcing in Firebase Console:
  https://console.firebase.google.com/project/jet-lag-map-companion/appcheck
  - Confirm jetlag-web is registered with reCAPTCHA v3
  - Monitor metrics 2–7 days after production ships tokens
  - Then enforce Firestore and Cloud Functions
`);
