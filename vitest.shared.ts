import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { sharedAlias } from "./vite.resolve-shared";

export default defineConfig({
  resolve: {
    alias: { ...sharedAlias },
  },
  plugins: [react()],
});
