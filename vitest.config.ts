import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";
import { optionalKernelWasmPkg } from "./vite.optional-kernel-wasm-pkg";

export default defineConfig({
  plugins: [optionalKernelWasmPkg(), react(), wasm()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    forceRerunTriggers: [
      "**/vitest.config.ts",
      "**/vite.config.ts",
      "**/package.json",
      "**/src/test/setup.ts",
    ],
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
        "src/domain/**": { lines: 65, branches: 50 },
        "src/services/**": { lines: 58, branches: 43 },
      },
    },
  },
});
