#!/usr/bin/env node
/**
 * Headless Wave 6 scenario catalog CLI: list / apply / reset.
 * Loads catalog + toLocalStorageSeed via Vite SSR (no React/Playwright).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** localStorage keys used by scenario session/map/annotations seeds. */
export const LOCAL_STORAGE_SEED_KEYS = ["jetlag-session", "jetlag-map", "jetlag-annotations"];

/** sessionStorage key for timerStore (not localStorage). */
export const SESSION_STORAGE_SEED_KEYS = ["jetlag-timer"];

async function loadCatalogModules() {
  const server = await createServer({
    configFile: false,
    root,
    logLevel: "error",
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: { alias: { "@": path.resolve(root, "src") } },
  });
  try {
    const catalog = await server.ssrLoadModule(path.resolve(root, "src/test/scenarios/catalog.ts"));
    const seedMod = await server.ssrLoadModule(
      path.resolve(root, "src/test/scenarios/adapters/toLocalStorageSeed.ts"),
    );
    return {
      listScenarios: catalog.listScenarios,
      getScenario: catalog.getScenario,
      toLocalStorageSeed: seedMod.toLocalStorageSeed,
      close: () => server.close(),
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}

function printUsage(stderr = console.error) {
  stderr(`Usage:
  npm run world -- list
  npm run world -- apply <scenarioId>
  npm run world -- reset`);
}

export async function runWorld(argv, { stdout = console.log, stderr = console.error } = {}) {
  const [command, scenarioId] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage(stdout);
    return 0;
  }

  if (command === "reset") {
    stdout("Clear scenario seed keys only (browser console or DevTools):");
    for (const key of LOCAL_STORAGE_SEED_KEYS) {
      stdout(`localStorage.removeItem(${JSON.stringify(key)});`);
    }
    for (const key of SESSION_STORAGE_SEED_KEYS) {
      stdout(`sessionStorage.removeItem(${JSON.stringify(key)});`);
    }
    stdout("");
    stdout("Does not wipe unrelated storage. Safe when no prior apply.");
    return 0;
  }

  if (command === "list") {
    const mods = await loadCatalogModules();
    try {
      const scenarios = mods.listScenarios();
      for (const scenario of scenarios) {
        stdout(`${scenario.id}\t${scenario.title}\t${scenario.tags.join(",")}`);
      }
      return 0;
    } finally {
      await mods.close();
    }
  }

  if (command === "apply") {
    if (!scenarioId) {
      stderr("Missing scenario id.");
      printUsage(stderr);
      return 1;
    }
    const mods = await loadCatalogModules();
    try {
      const known = mods.listScenarios().map((s) => s.id);
      if (!known.includes(scenarioId)) {
        stderr(`Unknown scenario id: ${scenarioId}`);
        stderr(`Known ids: ${known.join(", ") || "(none)"}`);
        return 1;
      }
      mods.getScenario(scenarioId);
      const seed = mods.toLocalStorageSeed(scenarioId);
      stdout(JSON.stringify(seed, null, 2));
      return 0;
    } finally {
      await mods.close();
    }
  }

  stderr(`Unknown command: ${command}`);
  printUsage(stderr);
  return 1;
}

async function main() {
  const code = await runWorld(process.argv.slice(2));
  process.exitCode = code;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
