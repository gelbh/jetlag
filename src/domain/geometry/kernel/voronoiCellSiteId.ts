import type { Feature, Point } from "geojson";

type VoronoiCellProperties = {
  site?: Feature<Point> | { properties?: Record<string, string | undefined> };
  sitecoordinates?: [number, number];
  [key: string]: unknown;
};

export type VoronoiSiteRef = { id: string; lat: number; lng: number };

export function voronoiCellSiteId(
  cell: Feature,
  keys: readonly string[] = ["featureId", "poiId"],
): string | undefined {
  const properties = cell.properties as VoronoiCellProperties | null | undefined;

  const site = properties?.site;
  if (site && typeof site === "object") {
    const siteProps =
      "properties" in site
        ? (site as Feature<Point>).properties
        : site.properties;

    if (siteProps && typeof siteProps === "object") {
      for (const key of keys) {
        const value = siteProps[key];
        if (typeof value === "string") {
          return value;
        }
      }
    }
  }

  for (const key of keys) {
    const direct = properties?.[key];
    if (typeof direct === "string") {
      return direct;
    }
  }

  return undefined;
}

/** Nearest site id for a cell when site metadata lacks an id (coordinate fallback). */
export function voronoiCellSiteIdByCoordinates(
  cell: Feature,
  sites: ReadonlyArray<VoronoiSiteRef>,
): string | undefined {
  const properties = cell.properties as VoronoiCellProperties | null | undefined;
  const site = properties?.site;

  let lng: number | undefined;
  let lat: number | undefined;

  if (site && typeof site === "object" && "geometry" in site) {
    const point = site as Feature<Point>;
    if (point.geometry?.type === "Point") {
      [lng, lat] = point.geometry.coordinates;
    }
  }

  if (lng == null || lat == null) {
    return undefined;
  }

  let nearestId: string | undefined;
  let minDistSq = Infinity;
  let runnerUpDistSq = Infinity;

  for (const ref of sites) {
    const dLng = ref.lng - lng;
    const dLat = ref.lat - lat;
    const distSq = dLng * dLng + dLat * dLat;
    if (distSq < minDistSq) {
      runnerUpDistSq = minDistSq;
      minDistSq = distSq;
      nearestId = ref.id;
    } else if (distSq < runnerUpDistSq) {
      runnerUpDistSq = distSq;
    }
  }

  if (
    nearestId == null ||
    !Number.isFinite(minDistSq) ||
    runnerUpDistSq - minDistSq < 1e-12
  ) {
    return undefined;
  }

  return nearestId;
}

export function resolveVoronoiCellSiteId(
  cell: Feature,
  sites: ReadonlyArray<VoronoiSiteRef>,
  keys: readonly string[] = ["poiId", "featureId"],
): string | undefined {
  return (
    voronoiCellSiteId(cell, keys) ?? voronoiCellSiteIdByCoordinates(cell, sites)
  );
}

/** @deprecated Use resolveVoronoiCellSiteId — tentacle POI alias kept for adapter shims. */
export function resolveVoronoiCellPoiId(
  cell: Feature,
  pois: ReadonlyArray<VoronoiSiteRef>,
  keys: readonly string[] = ["poiId"],
): string | undefined {
  return resolveVoronoiCellSiteId(cell, pois, keys);
}
