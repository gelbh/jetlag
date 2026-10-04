#!/usr/bin/env node
// LHCI server: `vite preview` of built `dist/` with prod's document routing in front
// (scripts/lhci-document-route.mjs), so `/`, `/join`, `/premium`, … audit the same HTML file
// the Worker serves. Auditing `/prerender/home/` directly hydrates the router's NotFound route.
// `wrangler dev` is not used: local workerd rejects the non-handler named exports on
// worker/index.ts.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { preview } from "vite";
import { resolveDocumentPath } from "./lhci-document-route.mjs";

const distDir = resolve(import.meta.dirname, "..", "dist");

/** @type {import("vite").Plugin} */
const prodDocumentRouting = {
  name: "lhci-prod-document-routing",
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = new URL(req.url ?? "/", "http://lhci.local");
      const documentPath = resolveDocumentPath(url.pathname, (path) =>
        existsSync(join(distDir, path)),
      );
      if (documentPath) {
        req.url = `${documentPath}${url.search}`;
      }
      next();
    });
  },
};

// Host/port must match the collect URLs in lighthouserc.shared.cjs.
const server = await preview({
  plugins: [prodDocumentRouting],
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
server.printUrls();
// Vite 8 bold-colors "Local", so LHCI's default /Local:/i never matches stdout.
// Plain ready line keeps startServerReadyPattern stable across Vite logger changes.
console.log("LHCI preview ready");
