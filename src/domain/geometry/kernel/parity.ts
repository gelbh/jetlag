import { maskTopologyMatches } from "./maskTopology";
import type { PolygonFeature } from "./types";

/** Grid point-in-polygon agreement for dual-run / WASM parity tests. */
export function assertPolygonTopologyParity(
  candidate: PolygonFeature | null,
  baseline: PolygonFeature | null,
  bbox: { west: number; east: number; south: number; north: number },
  steps = 12,
): void {
  if (candidate === null || baseline === null) {
    throw new Error("Expected non-null polygons for topology parity");
  }
  if (!maskTopologyMatches(candidate, baseline, bbox, steps)) {
    throw new Error("Polygon topology parity mismatch on sample grid");
  }
}
