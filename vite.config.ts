import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import wasm from "vite-plugin-wasm";
import { optionalKernelWasmPkg } from "./vite.optional-kernel-wasm-pkg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appVersion = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;


export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Avoid colliding with `vite preview` / Playwright (4173), which registers a SW.
    port: 5173,
    strictPort: false,
    // Worktrees under `.worktrees/` often resolve fonts from the primary
    // checkout's node_modules; allow that path so visual e2e matches CI.
    fs: {
      allow: [
        __dirname,
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../.."),
      ],
    },
  },
  // es2022: enough for module workers + modern Safari; avoid global `esnext`
  // (undownleveled main bundle). Worker wasm still loads via vite-plugin-wasm.
  build: {
    target: "es2022",
    sourcemap: mode === "production" ? "hidden" : true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-firebase",
              test: /node_modules\/firebase\/(?!storage|functions)/,
            },
            {
              name: "vendor-firebase-storage",
              test: /node_modules\/firebase\/storage/,
            },
            {
              name: "vendor-firebase-functions",
              test: /node_modules\/firebase\/functions/,
            },
            {
              name: "vendor-turf",
              test: /node_modules\/@turf\//,
            },
          ],
        },
      },
    },
  },
  worker: {
    plugins: () => [optionalKernelWasmPkg(), wasm()],
    format: "es",
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  plugins: [
    optionalKernelWasmPkg(),
    wasm(),
    ...(sentryAuthToken && sentryOrg && sentryProject
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuthToken,
            url: "https://de.sentry.io",
            release: {
              name: `jetlag@${appVersion}`,
            },
            sourcemaps: {
              filesToDeleteAfterUpload: ["./dist/**/*.map"],
            },
          }),
        ]
      : []),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/*.svg"],
      manifest: {
        name: "Jet Lag Map Companion",
        short_name: "Jetlag",
        description: "Live map annotations for Jet Lag Hide & Seek",
        theme_color: "#0E132C",
        background_color: "#0E132C",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
      },
    }),
  ],
}));
