#!/usr/bin/env node
/**
 * Production build orchestrator (wasm → tsc → vite → SEO/post checks).
 * Invoked by `npm run build`.
 */
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "node_modules", ".bin");
const env = {
  ...process.env,
  PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
};

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  // status is null when the child exits via signal — treat as failure
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "wasm:build"]);
run("tsc", ["-b"]);
run("vite", ["build"]);
run("node", ["scripts/delete-dist-sourcemaps.mjs"]);
run("node", ["scripts/check-elimination-mask-worker.mjs"]);
run("node", ["scripts/write-sitemap.mjs"]);
run("node", ["scripts/write-robots.mjs"]);
run("node", ["scripts/prerender-marketing.mjs"]);
run("node", ["scripts/check-prerender-seo.mjs"]);
