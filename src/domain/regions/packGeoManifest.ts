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
