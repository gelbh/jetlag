import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function readFirebaseProjectId() {
  const firebasercPath = resolve(projectRoot, ".firebaserc");
  if (!existsSync(firebasercPath)) {
    throw new Error("Missing .firebaserc project configuration.");
  }

  const config = JSON.parse(readFileSync(firebasercPath, "utf8"));
  const projectId = config.projects?.default;
  if (!projectId) {
    throw new Error("No default Firebase project in .firebaserc.");
  }

  return projectId;
}

const firebaseProjectId = readFirebaseProjectId();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** Firebase CLI output when Cloud Functions need Blaze / billing. */
function isBlazeOrArtifactRegistryBlock(output) {
  return (
    /must be on the blaze/i.test(output) ||
    /pay-as-you-go plan/i.test(output) ||
    /artifactregistry\.googleapis\.com can't be enabled/i.test(output)
  );
}

function shouldDeployFunctions(env) {
  const raw = String(env.DEPLOY_FIREBASE_FUNCTIONS ?? "").trim();
  if (raw === "") {
    return true;
  }
  return !/^(0|false|no|off)$/i.test(raw);
}

function parseFunctionUrls(deployOutput) {
  const urls = {};
  const pattern = /Function URL \((\w+)\([^)]+\)\):\s*(https:\/\/\S+)/g;
  for (const match of deployOutput.matchAll(pattern)) {
    urls[match[1]] = match[2];
  }
  return urls;
}

const HTTP_FUNCTION_IDS = ["overpass", "vehicles", "transitland"];

/** @returns {Record<string, string>} */
function listFunctionUrlsFromCli(projectId) {
  const result = spawnSync(
    "npx",
    ["firebase", "functions:list", "--project", projectId, "--json"],
    { cwd: projectRoot, encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.warn(
      "Could not list Cloud Functions for proxy URLs:",
      result.stderr?.trim() || result.stdout?.trim() || "unknown error",
    );
    return {};
  }

  try {
    const payload = JSON.parse(result.stdout);
    const functions = payload.result ?? payload;
    if (!Array.isArray(functions)) {
      return {};
    }

    const urls = {};
    for (const fn of functions) {
      if (
        typeof fn.id === "string" &&
        typeof fn.uri === "string" &&
        fn.uri.startsWith("https://") &&
        HTTP_FUNCTION_IDS.includes(fn.id)
      ) {
        urls[fn.id] = fn.uri;
      }
    }
    return urls;
  } catch (error) {
    console.warn(
      "Could not parse firebase functions:list output:",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/** @param {string} deployOutput */
function resolveFunctionUrls(deployOutput) {
  const fromDeploy = parseFunctionUrls(deployOutput);
  const needsFallback = HTTP_FUNCTION_IDS.some((id) => !fromDeploy[id]);
  if (!needsFallback) {
    return fromDeploy;
  }

  const fromList = listFunctionUrlsFromCli(firebaseProjectId);
  return { ...fromList, ...fromDeploy };
}

function printProxyEnvInstructions(functionUrls) {
  const lines = ["\nSet these in Cloudflare Pages (and .env.local for dev):"];

  lines.push(
    "  VITE_FIREBASE_APP_CHECK_SITE_KEY=<reCAPTCHA v3 site key from Firebase App Check>",
  );

  if (functionUrls.overpass) {
    lines.push(`  VITE_OVERPASS_PROXY_URL=${functionUrls.overpass}`);
  } else {
    lines.push(
      "  VITE_OVERPASS_PROXY_URL=<overpass function URL from Firebase console>",
    );
  }

  if (functionUrls.vehicles) {
    lines.push(`  VITE_TRANSIT_PROXY_URL=${functionUrls.vehicles}`);
  }

  if (functionUrls.transitland) {
    lines.push(`  VITE_TRANSITLAND_PROXY_URL=${functionUrls.transitland}`);
  }

  if (!functionUrls.overpass && !functionUrls.vehicles) {
    lines.push(
      "  (Function URLs were not found — copy them from the Firebase console → Functions.)",
    );
  }

  lines.push(
    `\n  Firebase Console → Functions: https://console.firebase.google.com/project/${firebaseProjectId}/functions`,
  );

  console.log(lines.join("\n"));
  printAppCheckRolloutInstructions();
}

function printAppCheckRolloutInstructions() {
  console.log(`
App Check rollout (jet-lag-map-companion):
  1. Register jetlag-web in Firebase Console → App Check with reCAPTCHA v3:
     https://console.firebase.google.com/project/jet-lag-map-companion/appcheck
  2. Set VITE_FIREBASE_APP_CHECK_SITE_KEY in Cloudflare Pages, then redeploy the frontend.
  3. Monitor verified vs unverified metrics for 2–7 days before enforcing.
  4. grantAccess now requires App Check (enforceAppCheck: true). Enforce only after
     metrics look healthy:
     - Firestore: App Check → APIs → Cloud Firestore → Enforce
     - Callable: App Check → APIs → Cloud Functions → Enforce
  5. Local dev against prod Firebase: run npm run dev, copy the debug token from the
     browser console, register it under jetlag-web → Manage debug tokens.
`);
}

/**
 * Runs `firebase deploy`, streaming stdio while capturing text for error detection.
 * @param {string} onlyTargets
 */
function runFirebaseDeploy(onlyTargets) {
  return new Promise((resolveDeploy) => {
    let output = "";
    const child = spawn(
      "npx",
      [
        "firebase",
        "deploy",
        "--project",
        firebaseProjectId,
        "--only",
        onlyTargets,
        "--force",
      ],
      { cwd: projectRoot, env: process.env },
    );

    const append = (chunk) => {
      const text = chunk.toString();
      output += text;
      return text;
    };

    child.stdout?.on("data", (chunk) => {
      process.stdout.write(append(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(append(chunk));
    });

    child.on("close", (code) => {
      resolveDeploy({ code: code ?? 1, output });
    });
    child.on("error", (err) => {
      console.error(err);
      resolveDeploy({ code: 1, output });
    });
  });
}

async function main() {
  run("npm", ["run", "lint"]);
  run("npm", ["run", "test:ci"]);

  const onlyFull = "firestore,functions";
  const onlyLite = "firestore";

  if (!shouldDeployFunctions(process.env)) {
    console.log(
      "Skipping Cloud Functions (DEPLOY_FIREBASE_FUNCTIONS is 0/false/no/off).",
    );
    const lite = await runFirebaseDeploy(onlyLite);
    if (lite.code !== 0) {
      process.exit(lite.code);
    }
    console.log("Backend deploy complete (Firestore).");
    return;
  }

  run("npm", ["ci"], { cwd: resolve(projectRoot, "functions") });

  let result = await runFirebaseDeploy(onlyFull);
  if (result.code === 0) {
    console.log("Backend deploy complete (Firestore + Functions).");
    printProxyEnvInstructions(resolveFunctionUrls(result.output));
    return;
  }

  if (isBlazeOrArtifactRegistryBlock(result.output)) {
    console.warn(
      "\nCloud Functions need the Blaze plan on this project. Retrying deploy without Functions...\n",
    );
    result = await runFirebaseDeploy(onlyLite);
    if (result.code !== 0) {
      process.exit(result.code);
    }
    console.warn(
      "Deployed Firestore only. TfL vehicle proxy (Functions) was not updated.",
    );
    console.warn(
      "Upgrade the Firebase project to Blaze to deploy Functions, or set DEPLOY_FIREBASE_FUNCTIONS=0 to skip the initial failed attempt.",
    );
    console.warn(
      "Blaze is pay-as-you-go; at infrequent usage the Overpass proxy stays within the free tier.\n",
    );
    console.log("Backend deploy complete (Firestore).");
    return;
  }

  process.exit(result.code);
}

await main();
