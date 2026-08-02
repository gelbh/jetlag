import type { Feature, FeatureCollection, Polygon } from "geojson";
import {
  loadKernelWasm,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type { SpatialVoronoiSite } from "./spatialVoronoi";

/** Reset lazy WASM module (tests). */
export const resetVoronoiWasmForTests = resetKernelWasmForTests;

function dedupeSpatialVoronoiSites<
  T extends Record<string, unknown> = Record<string, unknown>,
>(sites: Array<SpatialVoronoiSite<T>>): Array<SpatialVoronoiSite<T>> {
  const seen = new Set<string>();
  return sites.filter((site) => {
    const key = `${site.lng},${site.lat}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function spatialVoronoiSitesToCoords(
  sites: Array<SpatialVoronoiSite>,
): Float64Array {
  const coords = new Float64Array(sites.length * 2);
  for (let i = 0; i < sites.length; i += 1) {
    const site = sites[i]!;
    coords[i * 2] = site.lng;
    coords[i * 2 + 1] = site.lat;
  }
  return coords;
}

/** Unpack packed rings; `sites` must be 1:1 with cells (dedupe first). */
function featureCollectionFromVoronoiRings<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  sites: Array<SpatialVoronoiSite<T>>,
  packed: ArrayLike<number>,
): FeatureCollection {
  const features: Feature<Polygon>[] = [];
  let offset = 0;
  let siteIndex = 0;
  while (offset < packed.length) {
    const vertexCount = packed[offset]!;
    if (!Number.isFinite(vertexCount) || vertexCount < 4) {
      throw new Error("Geometry kernel returned an invalid Voronoi ring");
    }
    const n = vertexCount | 0;
    offset += 1;
    if (offset + n * 2 > packed.length) {
      throw new Error("Geometry kernel returned a truncated Voronoi ring");
    }
    if (siteIndex >= sites.length) {
      throw new Error("Geometry kernel returned more rings than sites");
    }
    const ring: [number, number][] = [];
    for (let i = 0; i < n; i += 1) {
      ring.push([packed[offset]!, packed[offset + 1]!]);
      offset += 2;
    }
    const site = sites[siteIndex]!;
    features.push({
      type: "Feature",
      properties: { ...site.properties },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    });
    siteIndex += 1;
  }
  if (siteIndex !== sites.length) {
    throw new Error("Geometry kernel returned fewer rings than sites");
  }
  return { type: "FeatureCollection", features };
}

/** Sync path for perf gates (pkg already loaded). */
export function buildSpatialVoronoiFromRingsSync<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  sites: Array<SpatialVoronoiSite<T>>,
  buildRings: (coords: Float64Array) => ArrayLike<number>,
): FeatureCollection {
  const working = dedupeSpatialVoronoiSites(sites);
  if (working.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }
  const packed = buildRings(spatialVoronoiSitesToCoords(working));
  return featureCollectionFromVoronoiRings(working, packed);
}

export async function wasmBuildSpatialVoronoiFromSites<
  T extends Record<string, unknown> = Record<string, unknown>,
>(sites: Array<SpatialVoronoiSite<T>>): Promise<FeatureCollection> {
  const wasm = await loadKernelWasm();
  return buildSpatialVoronoiFromRingsSync(sites, (coords) => {
    const result = wasm.build_spatial_voronoi_rings(coords);
    if (result == null || typeof (result as { length?: unknown }).length !== "number") {
      throw new Error("Geometry kernel returned a non-array Voronoi rings payload");
    }
    return result as ArrayLike<number>;
  });
}
