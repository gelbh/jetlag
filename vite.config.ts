import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

function injectGoogleAnalytics(mode: string): Plugin {
  return {
    name: "inject-google-analytics",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        if (mode !== "production") {
          return html;
        }

        const id = process.env.VITE_GA_MEASUREMENT_ID?.trim();
        if (!id) {
          return html;
        }

        const snippet = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}', { send_page_view: false });
    </script>`;

        return html.replace("</head>", `    ${snippet}\n  </head>`);
      },
    },
  };
}

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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-firebase",
              test: /node_modules\/firebase/,
            },
            {
              name: "vendor-leaflet",
              test: /node_modules\/(leaflet|react-leaflet)/,
            },
            {
              name: "vendor-turf",
              test: /node_modules\/@turf\//,
            },
            {
              name: "vendor-motion",
              test: /node_modules\/motion/,
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
    injectGoogleAnalytics(mode),
    react(),
    tailwindcss(),
    VitePWA({
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
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/([a-d]\.)?basemaps\.cartocdn\.com\/rastertiles\/voyager\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "carto-voyager-tiles",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "esri-satellite-tiles",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
}));
