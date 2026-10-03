#!/usr/bin/env node
/**
 * Thin Node entry for `npm run world`.
 * Loads typed `worldCli` via Vite SSR (extensionless TS graph); logic lives in src/.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadWorldCli() {
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
    const mod = await server.ssrLoadModule(path.resolve(root, "src/test/scenarios/worldCli.ts"));
    return {
      runWorld: mod.runWorld,
      close: () => server.close(),
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}

async function main() {
  const cli = await loadWorldCli();
  try {
    const code = cli.runWorld(process.argv.slice(2));
    process.exitCode = code;
  } finally {
    await cli.close();
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
