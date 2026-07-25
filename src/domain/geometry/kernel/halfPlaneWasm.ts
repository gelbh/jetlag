import type {
  GameAreaGeometry,
  LatLngTuple,
  PolygonFeature,
} from "./types";

type HalfPlaneWasmModule = {
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
};

let wasmModulePromise: Promise<HalfPlaneWasmModule> | null = null;

function isPolygonFeature(value: unknown): value is PolygonFeature {
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

function parseWasmFeature(result: unknown): PolygonFeature | null {
  if (result == null) {
    return null;
  }
  if (typeof result === "string") {
    if (result.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(result);
    return isPolygonFeature(parsed) ? parsed : null;
  }
  return isPolygonFeature(result) ? result : null;
}

async function loadHalfPlaneWasm(): Promise<HalfPlaneWasmModule> {
  if (!wasmModulePromise) {
    wasmModulePromise = import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    ) as Promise<HalfPlaneWasmModule>;
  }
  return wasmModulePromise;
}

/** Reset lazy WASM module (tests). */
export function resetHalfPlaneWasmForTests(): void {
  wasmModulePromise = null;
}

export async function wasmBuildHalfPlanePolygon(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameAreaGeometry,
  shadedSide: "hot" | "cold" = "cold",
  divisionAnchor: "midpoint" | "start" = "midpoint",
): Promise<PolygonFeature | null> {
  const wasm = await loadHalfPlaneWasm();
  const result = wasm.build_half_plane_polygon_json(
    JSON.stringify(pointA),
    JSON.stringify(pointB),
    JSON.stringify(gameArea),
    shadedSide,
    divisionAnchor,
  );
  return parseWasmFeature(result);
}

export async function wasmBuildRadarShadedRegion(
  center: LatLngTuple,
  radiusMeters: number,
  gameArea: GameAreaGeometry,
  shadedInside: boolean,
): Promise<PolygonFeature | null> {
  const wasm = await loadHalfPlaneWasm();
  const result = wasm.build_radar_shaded_region_json(
    JSON.stringify(center),
    radiusMeters,
    JSON.stringify(gameArea),
    shadedInside,
  );
  return parseWasmFeature(result);
}
