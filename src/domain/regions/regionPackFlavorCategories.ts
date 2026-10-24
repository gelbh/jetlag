import type { SessionCustomCategory } from "../session/catalog/sessionCustomContent";
import type { RegionPackId } from "./regionPack";

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

const PACK_FLAVOR_CATEGORIES: Record<RegionPackId, readonly SessionCustomCategory[]> = {
  dublin: DUBLIN_FLAVOR_CATEGORIES,
  nyc: EMPTY,
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
};

export function regionPackFlavorCategories(packId: RegionPackId): readonly SessionCustomCategory[] {
  return PACK_FLAVOR_CATEGORIES[packId];
}

/** Append pack flavor into host customs; keep first id on conflict. */
export function mergeRegionPackFlavorCategories(
  existing: readonly SessionCustomCategory[],
  packId: RegionPackId,
): SessionCustomCategory[] {
  const flavor = regionPackFlavorCategories(packId);
  if (flavor.length === 0) {
    return [...existing];
  }

  const seen = new Set(existing.map((category) => category.id));
  const merged = [...existing];
  for (const category of flavor) {
    if (seen.has(category.id)) {
      continue;
    }
    seen.add(category.id);
    merged.push(category);
  }
  return merged;
}
