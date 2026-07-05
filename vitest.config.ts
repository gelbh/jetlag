import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: [
      "functions/**",
      "dist/**",
      "node_modules/**",
      "e2e/**",
      "**/*.emulator.test.*",
      "src/test/emulator/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "**/*.test.*",
        "**/*.emulator.test.*",
        "src/main.tsx",
      ],
      thresholds: {
        "src/domain/**": { lines: 68, branches: 51 },
        "src/services/**": { lines: 60, branches: 47 },
        "src/hooks/**": { lines: 37, branches: 26 },
        "src/state/**": { lines: 70, branches: 65 },
        "src/routes/**": { lines: 45, branches: 40 },
        "src/components/**": { lines: 15, branches: 8 },
      },
    },
  },
});
