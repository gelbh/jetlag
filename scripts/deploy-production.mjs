import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";

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
const requiredFirebaseEnv = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

function loadProductionEnv() {
  return {
    ...loadEnv("production", projectRoot, ""),
    ...loadEnv("production", projectRoot, "VITE_"),
    ...process.env,
  };
}

function assertProductionEnv() {
  const env = loadProductionEnv();
  const missing = requiredFirebaseEnv.filter((key) => !env[key]?.trim());

  if (missing.length > 0) {
    console.error(
      `Missing production Firebase env for Vite build: ${missing.join(", ")}`,
    );
    console.error(
      "Set them in .env.production.local or .env.local before running deploy.",
    );
    process.exit(1);
  }

  return env;
}

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

/**
 * Runs `firebase deploy`, streaming stdio while capturing text for error detection.
 * @param {string} onlyTargets
 * @param {NodeJS.ProcessEnv} env merged over `process.env` for the child process
 */
function runFirebaseDeploy(onlyTargets, env) {
  return new Promise((resolve) => {
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
      ],
      { cwd: projectRoot, env: { ...process.env, ...env } },
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
      resolve({ code: code ?? 1, output });
    });
    child.on("error", (err) => {
      console.error(err);
      resolve({ code: 1, output });
    });
  });
}

async function main() {
  const productionEnv = assertProductionEnv();

  run("npm", ["run", "lint"]);
  run("npm", ["run", "test"]);
  run("npm", ["run", "build"], {
    env: { ...process.env, ...productionEnv },
  });

  const onlyFull = "hosting,firestore,functions";
  const onlyLite = "hosting,firestore";

  if (!shouldDeployFunctions(productionEnv)) {
    console.log(
      "Skipping Cloud Functions (DEPLOY_FIREBASE_FUNCTIONS is 0/false/no/off).",
    );
    const lite = await runFirebaseDeploy(onlyLite, productionEnv);
    if (lite.code !== 0) {
      process.exit(lite.code);
    }
    console.log("Production deploy complete (hosting + Firestore).");
    return;
  }

  run("npm", ["ci"], { cwd: resolve(projectRoot, "functions") });

  let result = await runFirebaseDeploy(onlyFull, productionEnv);
  if (result.code === 0) {
    console.log("Production deploy complete.");
    return;
  }

  if (isBlazeOrArtifactRegistryBlock(result.output)) {
    console.warn(
      "\nCloud Functions need the Blaze plan on this project. Retrying deploy without Functions...\n",
    );
    result = await runFirebaseDeploy(onlyLite, productionEnv);
    if (result.code !== 0) {
      process.exit(result.code);
    }
    console.warn(
      "Deployed hosting + Firestore only. TfL vehicle proxy (Functions) was not updated.",
    );
    console.warn(
      "Upgrade the Firebase project to Blaze to deploy Functions, or set DEPLOY_FIREBASE_FUNCTIONS=0 to skip the initial failed attempt.\n",
    );
    console.log("Production deploy complete.");
    return;
  }

  process.exit(result.code);
}

await main();
