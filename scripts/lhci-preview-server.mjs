#!/usr/bin/env node
// LHCI server: `vite preview` of built `dist/` plus the production Worker's
// exact-`/` remap to the prerendered home document (worker/assetFetch.ts).
// Plain `vite preview` serves the SPA shell at `/`, and auditing
// `/prerender/home/` directly hydrates the router's NotFound route, so neither
// matches prod. `wrangler dev` is not used: local workerd rejects the
// non-handler named exports on worker/index.ts.
import { preview } from "vite";

// Keep in sync with HOME_PRERENDER_PATH in worker/assetFetch.ts.
const HOME_PRERENDER_PATH = "/prerender/home/";

/** @type {import("vite").Plugin} */
const homePrerenderRemap = {
  name: "lhci-home-prerender-remap",
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/") {
        req.url = HOME_PRERENDER_PATH;
      }
      next();
    });
  },
};

// Host/port must match the collect URLs in lighthouserc.shared.cjs.
const server = await preview({
  plugins: [homePrerenderRemap],
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
server.printUrls();
