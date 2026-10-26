import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import {
  BASE_MEASURING_CATALOG,
  type MeasuringLocationCategory,
  TENTACLE_LOCATION_CATEGORY_IDS,
  type TentacleExtendedCategoryId,
} from "@/domain/questions";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";

export type PackGeoAssetKind = "poi" | "coastline" | "sea_level_seed" | "international_border";

export const REGION_PACK_REFERENCE_BBOXES: Record<RegionPackId, BoundingBox> = {
  dublin: { south: 53.1782, west: -6.5469, north: 53.6347, east: -5.9945 },
  nyc: { south: 40.49, west: -74.26, north: 40.92, east: -73.7 },
  london: { south: 51.28, west: -0.51, north: 51.7, east: 0.3357 },
  tokyo: { south: 35.5282, west: 139.5628, north: 35.8175, east: 139.9189 },
  osaka: { south: 34.5865, west: 135.3435, north: 34.7688, east: 135.5993 },
  zurich: { south: 47.1637, west: 8.3589, north: 47.699, east: 8.986 },
  lucerne: { south: 46.775, west: 7.839, north: 47.2903, east: 8.5213 },
  switzerland: { south: 45.798, west: 5.9359, north: 47.8285, east: 10.5121 },
  "portland-maine": {
    south: 43.4669,
    west: -70.492,
    north: 43.8488,
    east: -69.9759,
  },
  "prince-rupert": {
    south: 54.2016,
    west: -130.45,
    north: 54.4,
    east: -130.2,
  },
  southampton: { south: 50.86, west: -1.4973, north: 50.9761, east: -1.302 },
  amsterdam: { south: 52.268, west: 4.7188, north: 52.4411, east: 5.1177 },
  australia: { south: -43.7604, west: 112.9011, north: -9.1225, east: 159.1292 },
  // AABB from public/geo/sydney/lgas.geojson (+0.02° pad).
  sydney: { south: -34.3574, west: 149.9948, north: -32.9761, east: 151.363 },
  // AABB from public/geo/brussels/communes.geojson (+0.01° pad).
  brussels: { south: 50.7537, west: 4.2338, north: 50.9239, east: 4.4923 },
  // AABB from public/geo/brisbane/wards.geojson (+0.01° pad).
  brisbane: { south: -27.6702, west: 152.6697, north: -27.0116, east: 153.4782 },
  // AABB from public/geo/berlin/bezirke.geojson (+0.01° pad).
  berlin: { south: 52.3283, west: 13.0783, north: 52.6855, east: 13.7712 },
  // AABB from public/geo/singapore/planning-areas.geojson (+0.01° pad).
  singapore: { south: 1.1395, west: 103.5912, north: 1.4884, east: 104.1292 },
  // AABB from public/geo/utrecht/wijken.geojson (+0.01° pad).
  utrecht: { south: 52.0163, west: 4.9601, north: 52.1521, east: 5.2052 },
  // AABB from public/geo/wroclaw/dzielnice.geojson (+0.01° pad).
  wroclaw: { south: 51.0327, west: 16.7973, north: 51.2201, east: 17.1862 },
};

export const PACK_GEO_POINT_CATEGORIES = BASE_MEASURING_CATALOG.filter(
  (option) => option.targetKind === "point" && option.overpassSelectors.length > 0,
).map((option) => option.id) as readonly MeasuringLocationCategory[];

const PACK_GEO_POINT_CATEGORY_SET = new Set<string>(PACK_GEO_POINT_CATEGORIES);

export const PACK_GEO_TENTACLE_CATEGORIES = [
  ...TENTACLE_LOCATION_CATEGORY_IDS,
  "zoo",
  "aquarium",
  "amusement_park",
] as const satisfies readonly TentacleExtendedCategoryId[];

const PACK_GEO_TENTACLE_CATEGORY_SET = new Set<string>(PACK_GEO_TENTACLE_CATEGORIES);

export const PACK_GEO_PACK_IDS: readonly RegionPackId[] = REGION_PACK_IDS;

const PACK_GEO_PACK_ID_SET = new Set<string>(PACK_GEO_PACK_IDS);

export function isPackGeoPointCategory(category: string): category is MeasuringLocationCategory {
  return PACK_GEO_POINT_CATEGORY_SET.has(category);
}

export function isPackGeoTentacleCategory(
  category: string,
): category is (typeof PACK_GEO_TENTACLE_CATEGORIES)[number] {
  return PACK_GEO_TENTACLE_CATEGORY_SET.has(category);
}

export function isPackGeoSupported(
  packId: RegionPackId,
  kind: PackGeoAssetKind,
  category?: string,
): boolean {
  if (!PACK_GEO_PACK_ID_SET.has(packId)) {
    return false;
  }

  switch (kind) {
    case "poi":
      return category !== undefined && isPackGeoPointCategory(category);
    case "coastline":
    case "sea_level_seed":
    case "international_border":
      return category === undefined;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Bundled POI JSON URL. For `australia` with a State/Territory `subregionId`,
 * prefers `/geo/australia/poi/<stateId>/<category>.json` (bandwidth slice).
 * Callers should fall back to the national path when that asset is missing.
 */
export function packGeoPoiUrl(
  packId: RegionPackId,
  category: MeasuringLocationCategory | string,
  subregionId?: string,
): string {
  if (packId === "australia" && subregionId) {
    return `/geo/${packId}/poi/${subregionId}/${category}.json`;
  }
  return `/geo/${packId}/poi/${category}.json`;
}

export function packGeoCoastlineUrl(packId: RegionPackId): string {
  return `/geo/${packId}/coastline.json`;
}

export function packGeoInternationalBorderUrl(packId: RegionPackId): string {
  return `/geo/${packId}/international_border.json`;
}

export function packGeoSeaLevelSeedUrl(packId: RegionPackId): string {
  return `/geo/${packId}/sea_level_seed.json`;
}

export function packGeoPoiPublicPath(
  packId: RegionPackId,
  category: MeasuringLocationCategory | string,
  subregionId?: string,
): string {
  if (packId === "australia" && subregionId) {
    return `geo/${packId}/poi/${subregionId}/${category}.json`;
  }
  return `geo/${packId}/poi/${category}.json`;
}

export function packGeoCoastlinePublicPath(packId: RegionPackId): string {
  return `geo/${packId}/coastline.json`;
}

export function packGeoInternationalBorderPublicPath(packId: RegionPackId): string {
  return `geo/${packId}/international_border.json`;
}

export function packGeoSeaLevelSeedPublicPath(packId: RegionPackId): string {
  return `geo/${packId}/sea_level_seed.json`;
}
