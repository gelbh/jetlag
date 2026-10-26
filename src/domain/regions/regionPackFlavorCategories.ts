import type { SessionCustomCategory } from "../session/catalog/sessionCustomContent";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";

const EMPTY: readonly SessionCustomCategory[] = [];

const DUBLIN_FLAVOR_CATEGORIES: readonly SessionCustomCategory[] = [
  {
    id: "custom:dublin-luas-stop",
    label: "Luas stop",
    promptNoun: "a Luas stop",
    overpassSelectors: ['["railway"="tram_stop"]', '["station"="tram"]'],
  },
  {
    id: "custom:dublin-canal-lock",
    label: "Canal lock",
    promptNoun: "a canal lock",
    overpassSelectors: ['["waterway"="lock_gate"]', '["lock"="yes"]'],
  },
  {
    id: "custom:dublin-gaa-ground",
    label: "GAA ground",
    promptNoun: "a GAA ground",
    overpassSelectors: [
      '["leisure"="pitch"]["sport"="gaelic_games"]',
      '["leisure"="stadium"]["sport"="gaelic_games"]',
    ],
  },
  {
    id: "custom:dublin-castle-fort",
    label: "Castle or fort",
    promptNoun: "a castle or fort",
    overpassSelectors: ['["historic"="castle"]', '["historic"="fort"]'],
  },
];

const NYC_FLAVOR_CATEGORIES: readonly SessionCustomCategory[] = [
  {
    id: "custom:nyc-ferry-terminal",
    label: "Ferry terminal",
    promptNoun: "a ferry terminal",
    overpassSelectors: ['["amenity"="ferry_terminal"]'],
  },
  {
    id: "custom:nyc-pizza",
    label: "Pizza place",
    promptNoun: "a pizza place",
    overpassSelectors: [
      '["amenity"="fast_food"]["cuisine"="pizza"]',
      '["amenity"="restaurant"]["cuisine"="pizza"]',
    ],
  },
  {
    id: "custom:nyc-basketball-court",
    label: "Basketball court",
    promptNoun: "a basketball court",
    overpassSelectors: ['["leisure"="pitch"]["sport"="basketball"]'],
  },
  {
    id: "custom:nyc-deli",
    label: "Deli",
    promptNoun: "a deli",
    overpassSelectors: ['["shop"="deli"]'],
  },
];

const PACK_FLAVOR_CATEGORIES: Record<RegionPackId, readonly SessionCustomCategory[]> = {
  dublin: DUBLIN_FLAVOR_CATEGORIES,
  nyc: NYC_FLAVOR_CATEGORIES,
  london: EMPTY,
  tokyo: EMPTY,
  osaka: EMPTY,
  zurich: EMPTY,
  lucerne: EMPTY,
  switzerland: EMPTY,
  "portland-maine": EMPTY,
  "prince-rupert": EMPTY,
  southampton: EMPTY,
  australia: EMPTY,
  sydney: EMPTY,
  brussels: EMPTY,
};

const KNOWN_PACK_FLAVOR_IDS: ReadonlySet<string> = new Set(
  REGION_PACK_IDS.flatMap((packId) =>
    PACK_FLAVOR_CATEGORIES[packId].map((category) => category.id),
  ),
);

export function regionPackFlavorCategories(packId: RegionPackId): readonly SessionCustomCategory[] {
  return PACK_FLAVOR_CATEGORIES[packId];
}

/** True only for registered pack flavor ids (exact match; no pack-prefix guessing). */
export function isKnownRegionPackFlavorCategoryId(id: string): boolean {
  return KNOWN_PACK_FLAVOR_IDS.has(id);
}

/** Drop prior pack flavor slots so a pack switch cannot leave stale flavor. */
export function stripKnownRegionPackFlavorCategories(
  existing: readonly SessionCustomCategory[],
): SessionCustomCategory[] {
  return existing.filter((category) => !isKnownRegionPackFlavorCategoryId(category.id));
}

/** Replace pack flavor slots with the given pack's list; keep host customs. */
export function mergeRegionPackFlavorCategories(
  existing: readonly SessionCustomCategory[],
  packId: RegionPackId,
): SessionCustomCategory[] {
  const withoutPackFlavor = stripKnownRegionPackFlavorCategories(existing);
  const flavor = regionPackFlavorCategories(packId);
  if (flavor.length === 0) {
    return withoutPackFlavor;
  }

  const seen = new Set(withoutPackFlavor.map((category) => category.id));
  const merged = [...withoutPackFlavor];
  for (const category of flavor) {
    if (seen.has(category.id)) {
      continue;
    }
    seen.add(category.id);
    merged.push(category);
  }
  return merged;
}
