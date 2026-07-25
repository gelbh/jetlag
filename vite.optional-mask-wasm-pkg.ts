import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const maskWasmPkgJs = resolve(
  repoRoot,
  "crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const maskWasmPkgStubId = "\0jetlag-geometry-kernel-wasm-stub";

function isMaskWasmPkgSpecifier(
  id: string,
  importer: string | undefined,
): boolean {
  if (id === maskWasmPkgStubId || id.includes("jetlag_geometry_kernel.js")) {
    return true;
  }
  if (importer && id.startsWith(".")) {
    return resolve(dirname(importer), id) === maskWasmPkgJs;
  }
  if (isAbsolute(id)) {
    return id === maskWasmPkgJs;
  }
  return false;
}

/** Stub gitignored pkg/ so Vite/Vitest can load the graph without wasm:build. */
export function optionalMaskWasmPkg(): Plugin {
  return {
    name: "optional-mask-wasm-pkg",
    resolveId(id, importer) {
      if (!isMaskWasmPkgSpecifier(id, importer)) {
        return null;
      }
      if (existsSync(maskWasmPkgJs)) {
        return null;
      }
      return maskWasmPkgStubId;
    },
    load(id) {
      if (id !== maskWasmPkgStubId) {
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
