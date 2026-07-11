import { spawnSync } from "node:child_process";

/** @type {Record<string, string>} */
const PROXY_SECRET_NAMES = {
  overpass: "VITE_OVERPASS_PROXY_URL",
  vehicles: "VITE_TRANSIT_PROXY_URL",
  transitland: "VITE_TRANSITLAND_PROXY_URL",
};

function ghEnv() {
  const pat = process.env.GH_PAT?.trim();
  if (!pat) {
    return null;
  }

  return { ...process.env, GH_TOKEN: pat };
}

/**
 * @param {Record<string, string>} functionUrls
 * @returns {boolean} true when at least one secret was updated
 */
export function syncProxySecrets(functionUrls) {
  if (!process.env.GITHUB_ACTIONS) {
    return false;
  }

  const env = ghEnv();
  if (!env) {
    console.warn(
      "GH_PAT is not set; skipping proxy URL sync to GitHub secrets.",
    );
    console.warn(
      "Add a repo secret GH_PAT (PAT with repo scope) or update VITE_*_PROXY_URL manually.",
    );
    return false;
  }

  let synced = false;

  for (const [functionId, secretName] of Object.entries(PROXY_SECRET_NAMES)) {
    const url = functionUrls[functionId];
    if (!url) {
      continue;
    }

    const result = spawnSync(
      "gh",
      ["secret", "set", secretName, "--body", url],
      { stdio: "inherit", env },
    );

    if (result.status !== 0) {
      console.error(`Failed to set GitHub secret ${secretName}.`);
      process.exit(1);
    }

    console.log(`Updated GitHub secret ${secretName}.`);
    synced = true;
  }

  return synced;
}
