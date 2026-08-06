import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import {
  BASE_MEASURING_CATALOG,
  TENTACLE_LOCATION_CATEGORY_IDS,
  type MeasuringLocationCategory,
  type TentacleExtendedCategoryId,
} from "@/domain/questions";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";

/** Static asset kinds under `/geo/{packId}/`. */
export type PackGeoAssetKind = "poi" | "coastline" | "sea_level_seed";

/**
 * Per-pack reference bounding boxes for attach scoring (v1 embed).
 * Primary extents from `public/geo/{packId}/` GeoJSON; expanded slightly where
 * POI `bbox` fields (2-decimal / airport padding) extend outside the primary
 * boundary so attach validation stays consistent with on-disk POI metadata.
 */
export const REGION_PACK_REFERENCE_BBOXES: Record<RegionPackId, BoundingBox> = {
  dublin: { south: 53.1782, west: -6.5469, north: 53.6347, east: -5.9945 },
  // Union with POI file bboxes (2-decimal rounding of borough extent).
  nyc: { south: 40.49, west: -74.26, north: 40.92, east: -73.7 },
  // Union with POI file bboxes (2-decimal rounding of borough extent).
  london: { south: 51.28, west: -0.51, north: 51.7, east: 0.3357 },
  tokyo: { south: 35.5282, west: 139.5628, north: 35.8175, east: 139.9189 },
  osaka: { south: 34.5865, west: 135.3435, north: 34.7688, east: 135.5993 },
  zurich: { south: 47.1637, west: 8.3589, north: 47.699, east: 8.986 },
  lucerne: { south: 46.775, west: 7.839, north: 47.2903, east: 8.5213 },
  "portland-maine": {
    south: 43.4669,
    west: -70.492,
    north: 43.8488,
    east: -69.9759,
  },
  // Union with POI bboxes (airport west of city.geojson extent).
  "prince-rupert": {
    south: 54.2016,
    west: -130.45,
    north: 54.4,
    east: -130.2,
  },
};

export function regionPackReferenceBoundingBox(
  packId: RegionPackId,
): BoundingBox {
  return REGION_PACK_REFERENCE_BBOXES[packId];
}

/**
 * Measuring point categories with Overpass selectors (excludes custom_place and
 * non-point kinds). Every listed id should have a pack POI JSON path.
 * Runtime may fetch empty `source:"none"` stubs until Wikidata fills them.
 */
export const PACK_GEO_POINT_CATEGORIES = BASE_MEASURING_CATALOG.filter(
  (option) =>
    option.targetKind === "point" && option.overpassSelectors.length > 0,
).map((option) => option.id) as readonly MeasuringLocationCategory[];

const PACK_GEO_POINT_CATEGORY_SET = new Set<string>(PACK_GEO_POINT_CATEGORIES);

/** Tentacle categories that reuse measuring point POI bundles. */
export const PACK_GEO_TENTACLE_CATEGORIES = [
  ...TENTACLE_LOCATION_CATEGORY_IDS,
  "zoo",
  "aquarium",
  "amusement_park",
] as const satisfies readonly TentacleExtendedCategoryId[];

const PACK_GEO_TENTACLE_CATEGORY_SET = new Set<string>(
  PACK_GEO_TENTACLE_CATEGORIES,
);

/** All recommended region packs participate in the pack geo matrix. */
export const PACK_GEO_PACK_IDS: readonly RegionPackId[] = REGION_PACK_IDS;

const PACK_GEO_PACK_ID_SET = new Set<string>(PACK_GEO_PACK_IDS);

export function isPackGeoPointCategory(
  category: string,
): category is MeasuringLocationCategory {
  return PACK_GEO_POINT_CATEGORY_SET.has(category);
}

export function isPackGeoTentacleCategory(
  category: string,
): category is (typeof PACK_GEO_TENTACLE_CATEGORIES)[number] {
  return PACK_GEO_TENTACLE_CATEGORY_SET.has(category);
}

/**
 * Whether a pack/kind(/category) is in the supported matrix.
 * Coastline and sea-level seeds are pack-scoped (no category).
 */
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
      return category === undefined;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function packGeoPoiUrl(
  packId: RegionPackId,
  category: MeasuringLocationCategory | string,
): string {
  return `/geo/${packId}/poi/${category}.json`;
}

export function packGeoCoastlineUrl(packId: RegionPackId): string {
  return `/geo/${packId}/coastline.json`;
}

export function packGeoSeaLevelSeedUrl(packId: RegionPackId): string {
  return `/geo/${packId}/sea_level_seed.json`;
}

/** Relative path under `public/` for on-disk matrix checks. */
export function packGeoPoiPublicPath(
  packId: RegionPackId,
  category: MeasuringLocationCategory | string,
): string {
  return `geo/${packId}/poi/${category}.json`;
}

export function packGeoCoastlinePublicPath(packId: RegionPackId): string {
  return `geo/${packId}/coastline.json`;
}

export function packGeoSeaLevelSeedPublicPath(packId: RegionPackId): string {
  return `geo/${packId}/sea_level_seed.json`;
}
