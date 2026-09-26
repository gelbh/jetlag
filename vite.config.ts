import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { clientChunkGroups } from "./vite.chunk-groups";
import { optionalKernelWasmPkg } from "./vite.optional-kernel-wasm-pkg";
import { createPwaPlugin } from "./vite.pwa";
import { createSentryPlugins } from "./vite.sentry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appVersion = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

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
    // checkout's node_modules; allow that path so e2e matches CI.
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
          groups: clientChunkGroups,
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
    ...createSentryPlugins({ appVersion }),
    react(),
    tailwindcss(),
    createPwaPlugin(),
  ],
}));
