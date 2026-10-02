#!/usr/bin/env node
/**
 * Entry critical-path budget (runs after `vite build`, needs `build.manifest`).
 * Walks static `imports` from index.html in dist/.vite/manifest.json, sums gzip
 * JS + CSS, and fails when over budget or when heavy vendor libs sneak back in.
 * Also walks the static imports of the `src/App.tsx` chunk (main.tsx loads it
 * at boot and the prerendered home modulepreloads it, so its static closure is
 * critical path too) with the same forbidden-chunk checks; no size limit.
 * KB = 1024 bytes. Always removes dist/.vite afterwards so the manifest isn't
 * deployed, so re-running this script alone needs a fresh `vite build`.
 */
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Measured 71.9 KB gz + ~10% headroom (target ceiling stays 130 KB gz).
export const JS_LIMIT_KB = 80;
// Measured 33.0 KB gz after the Mantine per-component CSS split + ~10% headroom
// (the rest is app CSS: map chrome, motion, Tailwind utilities, fonts).
export const CSS_LIMIT_KB = 36;

const FORBIDDEN_SRC = /node_modules\/(firebase|posthog-js|@sentry|@turf|maplibre-gl)\//;
// `sentry` / `analytics` are the app-owned wrappers that pull @sentry / posthog.
const FORBIDDEN_NAME = /^(vendor-firebase|vendor-turf)|^(sentry|analytics)$/;
export const APP_CHUNK_KEY = "src/App.tsx";

const kb = (bytes) => bytes / 1024;

const isForbiddenChunk = (chunk) =>
  FORBIDDEN_SRC.test(chunk.src ?? "") || FORBIDDEN_NAME.test(chunk.name ?? "");

/** Forbidden chunks statically reachable from `rootKey` (root included). */
function findForbiddenStaticChunks(manifest, rootKey) {
  const seen = new Set();
  const found = [];
  const walk = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`manifest missing chunk ${key}`);
    if (isForbiddenChunk(chunk)) found.push({ key, chunk });
    for (const imp of chunk.imports ?? []) walk(imp);
  };
  walk(rootKey);
  return found;
}

/**
 * @param {{ manifest: Record<string, any>, sizeOf: (file: string) => number,
 *   limits?: { jsKb: number, cssKb: number } }} args
 */
export function evaluateEntryBudget({
  manifest,
  sizeOf,
  limits = { jsKb: JS_LIMIT_KB, cssKb: CSS_LIMIT_KB },
}) {
  const entryKey =
    "index.html" in manifest
      ? "index.html"
      : Object.keys(manifest).find((k) => manifest[k].isEntry && manifest[k].src === "index.html");
  if (!entryKey) throw new Error("index.html entry not found in manifest");

  const seen = new Set();
  const cssSeen = new Set();
  const rows = [];
  const violations = [];
  let jsBytes = 0;
  let cssBytes = 0;

  const walk = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`manifest missing chunk ${key}`);
    const bytes = sizeOf(chunk.file);
    jsBytes += bytes;
    rows.push({ kind: "js", file: chunk.file, bytes });
    if (isForbiddenChunk(chunk)) {
      violations.push(
        `forbidden chunk on entry path: ${chunk.name ?? chunk.src ?? key} (${chunk.file})`,
      );
    }
    for (const css of chunk.css ?? []) {
      if (cssSeen.has(css)) continue;
      cssSeen.add(css);
      const b = sizeOf(css);
      cssBytes += b;
      rows.push({ kind: "css", file: css, bytes: b });
    }
    for (const imp of chunk.imports ?? []) walk(imp);
  };
  walk(entryKey);

  const appChecked = APP_CHUNK_KEY in manifest;
  if (appChecked) {
    const appFile = manifest[APP_CHUNK_KEY].file;
    for (const { key, chunk } of findForbiddenStaticChunks(manifest, APP_CHUNK_KEY)) {
      violations.push(
        `forbidden chunk on App static path (${appFile}): ${chunk.name ?? chunk.src ?? key} (${chunk.file})`,
      );
    }
  }

  rows.sort((a, b) => b.bytes - a.bytes);
  const jsKb = kb(jsBytes);
  const cssKb = kb(cssBytes);
  if (jsKb > limits.jsKb) violations.push(`JS ${jsKb.toFixed(1)} KB gz > limit ${limits.jsKb} KB`);
  if (cssKb > limits.cssKb)
    violations.push(`CSS ${cssKb.toFixed(1)} KB gz > limit ${limits.cssKb} KB`);
  return { rows, jsKb, cssKb, violations, appChecked };
}

function main() {
  const dist = resolve("dist");
  try {
    const manifest = JSON.parse(readFileSync(resolve(dist, ".vite/manifest.json"), "utf8"));
    const sizeOf = (file) => gzipSync(readFileSync(resolve(dist, file)), { level: 9 }).length;
    const limits = { jsKb: JS_LIMIT_KB, cssKb: CSS_LIMIT_KB };
    const { rows, jsKb, cssKb, violations, appChecked } = evaluateEntryBudget({
      manifest,
      sizeOf,
      limits,
    });
    console.log("Entry critical path (gzip, KB = 1024 bytes)");
    for (const r of rows)
      console.log(`  ${kb(r.bytes).toFixed(1).padStart(7)}  ${r.kind.padEnd(3)}  ${r.file}`);
    console.log(`  JS  total ${jsKb.toFixed(1)} KB (limit ${limits.jsKb} KB)`);
    console.log(`  CSS total ${cssKb.toFixed(1)} KB (limit ${limits.cssKb} KB)`);
    // Fail closed: a moved/renamed App.tsx must not silently drop the App walk.
    if (!appChecked) violations.push(`no ${APP_CHUNK_KEY} chunk in manifest; App walk skipped`);
    if (violations.length) {
      console.error("Entry budget violations:");
      for (const v of violations) console.error(`  - ${v}`);
      process.exitCode = 1;
    }
  } finally {
    rmSync(resolve(dist, ".vite"), { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
