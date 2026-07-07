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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  grep: process.env.E2E_SMOKE ? /@smoke/ : undefined,
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    geolocation: { latitude: 53.35, longitude: -6.26 },
    permissions: ["geolocation"],
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort"
      : "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 120_000,
    env: firebaseEnv,
  },
});
