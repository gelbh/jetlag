#!/usr/bin/env node
/**
 * Production build orchestrator (wasm → tsc → vite → SEO/post checks).
 * Invoked by `npm run build`.
 */
import { run } from "../lib/run-command.mjs";

run("npm", ["run", "wasm:build"]);
run("tsc", ["-b"]);
run("vite", ["build"]);
run("node", ["scripts/build/delete-dist-sourcemaps.mjs"]);
run("node", ["scripts/build/check-elimination-mask-worker.mjs"]);
run("node", ["scripts/build/write-crawl-artifacts.mjs"]);
run("node", ["scripts/build/prerender-marketing.mjs"]);
run("node", ["scripts/build/check-prerender-seo.mjs"]);
run("node", ["scripts/build/check-entry-budget.mjs"]);
