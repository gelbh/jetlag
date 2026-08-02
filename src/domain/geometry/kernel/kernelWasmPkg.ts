import type { PolygonFeature } from "./types";

/** Full wasm-bindgen surface for the geometry kernel pkg. */
export type KernelWasmModule = {
  build_mask_from_union_input_json: (
    inputJson: string,
    gameAreaJson: string,
  ) => unknown;
  build_end_game_mask_from_disks_json: (
    gameAreaJson: string,
    disksJson: string,
  ) => unknown;
  build_half_plane_polygon_json: (
    pointAJson: string,
    pointBJson: string,
    gameAreaJson: string,
    shadedSide: string,
    divisionAnchor: string,
  ) => unknown;
  build_radar_shaded_region_json: (
    centerJson: string,
    radiusMeters: number,
    gameAreaJson: string,
    shadedInside: boolean,
  ) => unknown;
  geodesic_line_buffer_json: (
    coordinatesJson: string,
    distanceMeters: number,
    sampleSpacingMeters?: number | null,
  ) => unknown;
  build_tentacle_elimination_region_json: (
    anchorJson: string,
    radiusMeters: number,
    sitesJson: string,
    answeredSiteId: string,
    gameAreaJson: string,
    voronoiCellsJson: string,
  ) => unknown;
  build_tentacle_poi_answer_elimination_region_json: (
    anchorJson: string,
    radiusMeters: number,
    sitesJson: string,
    answeredSiteId: string,
    gameAreaJson: string,
    voronoiCellsJson: string,
  ) => unknown;
  build_spatial_voronoi_json: (sitesJson: string) => unknown;
  build_near_region_json: (inputJson: string) => unknown;
};

let wasmModulePromise: Promise<KernelWasmModule> | null = null;

export function isPolygonFeature(value: unknown): value is PolygonFeature {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const feature = value as { type?: unknown; geometry?: unknown };
  if (feature.type !== "Feature") {
    return false;
  }
  if (feature.geometry == null || typeof feature.geometry !== "object") {
    return false;
  }
  const geometryType = (feature.geometry as { type?: unknown }).type;
  return geometryType === "Polygon" || geometryType === "MultiPolygon";
}

export function parseWasmFeature(result: unknown): PolygonFeature | null {
  if (result == null) {
    return null;
  }
  if (typeof result === "string") {
    if (result.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(result);
    if (isPolygonFeature(parsed)) {
      return parsed;
    }
    throw new Error("Geometry kernel returned an invalid feature");
  }
  if (isPolygonFeature(result)) {
    return result;
  }
  throw new Error("Geometry kernel returned an invalid feature");
}

/** Single shared pkg promise for mask / half-plane / geodesic wrappers. */
export async function loadKernelWasm(): Promise<KernelWasmModule> {
  if (!wasmModulePromise) {
    // Relative path: pkg/ is gitignored; avoid file: dep so npm ci works before wasm:build.
    wasmModulePromise = (
      import(
        "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
      ) as Promise<KernelWasmModule>
    ).catch((error) => {
      wasmModulePromise = null;
      throw error;
    });
  }
  return wasmModulePromise;
}

/** Reset lazy WASM module (tests). */
export function resetKernelWasmForTests(): void {
  wasmModulePromise = null;
}
