import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const appVersion = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

export default defineConfig(({ mode }) => ({
  server: {
    // Avoid colliding with `vite preview` / Playwright (4173), which registers a SW.
    port: 5173,
    strictPort: false,
  },
  build: {
    sourcemap: mode === "production" ? "hidden" : true,
    worker: {
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
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
              name: "vendor-leaflet",
              test: /node_modules\/(leaflet|react-leaflet)/,
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
  plugins: [
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
