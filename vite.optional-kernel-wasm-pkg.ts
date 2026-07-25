import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const kernelWasmPkgJs = resolve(
  repoRoot,
  "crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const kernelWasmPkgStubId = "\0jetlag-geometry-kernel-wasm-stub";

function isKernelWasmPkgSpecifier(
  id: string,
  importer: string | undefined,
): boolean {
  if (id === kernelWasmPkgStubId || id.includes("jetlag_geometry_kernel.js")) {
    return true;
  }
  if (importer && id.startsWith(".")) {
    return resolve(dirname(importer), id) === kernelWasmPkgJs;
  }
  if (isAbsolute(id)) {
    return id === kernelWasmPkgJs;
  }
  return false;
}

/** Stub gitignored pkg/ so Vite/Vitest can load the graph without wasm:build. */
export function optionalKernelWasmPkg(): Plugin {
  return {
    name: "optional-kernel-wasm-pkg",
    resolveId(id, importer) {
      if (!isKernelWasmPkgSpecifier(id, importer)) {
        return null;
      }
      if (existsSync(kernelWasmPkgJs)) {
        return null;
      }
      return kernelWasmPkgStubId;
    },
    load(id) {
      if (id !== kernelWasmPkgStubId) {
        return null;
      }
      return `
export function build_mask_from_union_input_json() {
  throw new Error("jetlag-geometry-kernel pkg missing; run npm run wasm:build");
}
export function build_end_game_mask_from_disks_json() {
  throw new Error("jetlag-geometry-kernel pkg missing; run npm run wasm:build");
}
export function build_half_plane_polygon_json() {
  throw new Error("jetlag-geometry-kernel pkg missing; run npm run wasm:build");
}
export function build_radar_shaded_region_json() {
  throw new Error("jetlag-geometry-kernel pkg missing; run npm run wasm:build");
}
export function geodesic_line_buffer_json() {
  throw new Error("jetlag-geometry-kernel pkg missing; run npm run wasm:build");
}
export default {};
`;
    },
  };
}
