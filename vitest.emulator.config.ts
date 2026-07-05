import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: "./src/test/emulator/setup.ts",
    include: ["**/*.emulator.test.{ts,tsx}", "src/test/emulator/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
