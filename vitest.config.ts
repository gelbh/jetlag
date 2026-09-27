import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";
import { optionalKernelWasmPkg } from "./vite.optional-kernel-wasm-pkg";

export default defineConfig({
  test: {
    // Root-only (NonProjectOptions): watcher ignores these on project configs.
    forceRerunTriggers: [
      "**/vitest.config.ts",
      "**/vitest.shared.ts",
      "**/vite.resolve-shared.ts",
      "**/vite.config.ts",
      "**/package.json",
      "**/src/test/setup.ts",
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
    projects: [
      {
        extends: "./vitest.shared.ts",
        // vite-plugin-wasm embeds .wasm as base64 only when it sees a plugin
        // named exactly "vitest". Vitest projects register "vitest:project"
        // instead, so URL fetch breaks in jsdom (Invalid URL).
        plugins: [{ name: "vitest" }, optionalKernelWasmPkg(), wasm()],
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: "./src/test/setup.ts",
          exclude: [
            "functions/**",
            "dist/**",
            "node_modules/**",
            "e2e/**",
            "scripts/**",
            // node:test suite; run via `npm run test:changeset-map`.
            ".changeset/**",
            "**/*.emulator.test.*",
            "src/test/emulator/**",
            // Sibling git worktrees must not be collected from the primary clone.
            ".worktrees/**",
          ],
        },
      },
      {
        extends: "./vitest.shared.ts",
        test: {
          name: "emulator",
          environment: "node",
          setupFiles: "./src/test/emulator/setup.ts",
          include: [
            "**/*.emulator.test.{ts,tsx}",
            "src/test/emulator/**/*.test.ts",
          ],
          exclude: [".changeset/**", ".worktrees/**", "node_modules/**", "dist/**"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
    ],
  },
});
