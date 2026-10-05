import { defineConfig, devices } from "@playwright/test";

const firebaseEnv = {
  VITE_USE_FIREBASE_EMULATOR: "true",
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-jetlag.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "demo-jetlag",
  VITE_FIREBASE_STORAGE_BUCKET: "demo-jetlag.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  VITE_FIREBASE_APP_ID: "1:1234567890:web:demo",
};

/** CI, or `test:e2e:resilience` (E2E_PREVIEW=1): build + vite preview instead of dev. */
const usePreviewBuild = Boolean(process.env.CI || process.env.E2E_PREVIEW);
const previewCommand = "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort";

const mobileDevice = {
  ...devices["iPhone 13"],
  browserName: "chromium" as const,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    geolocation: { latitude: 53.35, longitude: -6.26 },
    permissions: ["geolocation"],
    serviceWorkers: "block",
  },
  projects: process.env.E2E_GATE_SMOKE
    ? [
        {
          name: "gate-smoke",
          testMatch: /e2e\/smoke\/.+\.spec\.ts/,
          use: mobileDevice,
        },
      ]
    : process.env.E2E_SMOKE
      ? [{ name: "smoke", grep: /@smoke/, use: mobileDevice }]
      : [
          {
            name: "features",
            testMatch: /e2e\/features\/.+\.spec\.ts/,
            use: mobileDevice,
          },
          {
            name: "smoke-folder",
            testMatch: /e2e\/smoke\/.+\.spec\.ts/,
            use: mobileDevice,
          },
          // Offline / lie-fi gameplay needs the real SW (precache, offline boot),
          // which only the preview build registers: listed only when preview runs.
          ...(usePreviewBuild
            ? [
                {
                  name: "resilience",
                  testMatch: /e2e\/resilience\/.+\.spec\.ts/,
                  timeout: 120_000,
                  use: { ...mobileDevice, serviceWorkers: "allow" as const },
                },
              ]
            : []),
        ],
  webServer: {
    command: usePreviewBuild
      ? // E2E_SKIP_BUILD: a second CI run in the same job reuses the first one's dist/.
        `${process.env.E2E_SKIP_BUILD ? "" : "npm run build && "}${previewCommand}`
      : "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : usePreviewBuild ? 300_000 : 120_000,
    env: firebaseEnv,
  },
});
