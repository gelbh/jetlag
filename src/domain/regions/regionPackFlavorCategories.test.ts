import { describe, expect, it } from "vitest";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";
import { regionPackFlavorCategories } from "./regionPackFlavorCategories";

const DUBLIN_FLAVOR_IDS = [
  "custom:dublin-luas-stop",
  "custom:dublin-canal-lock",
  "custom:dublin-gaa-ground",
  "custom:dublin-castle-fort",
] as const;

describe("regionPackFlavorCategories", () => {
  it("returns a readonly array for every region pack id", () => {
    for (const packId of REGION_PACK_IDS) {
      const categories = regionPackFlavorCategories(packId);
      expect(Array.isArray(categories)).toBe(true);
    }
  });

  it("returns empty for every non-Dublin pack", () => {
    const nonDublin = REGION_PACK_IDS.filter((id): id is RegionPackId => id !== "dublin");
    for (const packId of nonDublin) {
      expect(regionPackFlavorCategories(packId)).toEqual([]);
    }
  });

  it("returns the locked Dublin flavor categories", () => {
    const categories = regionPackFlavorCategories("dublin");

    expect(categories).toEqual([
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
    ]);
  });

  it("uses unique Dublin flavor ids with non-empty selectors", () => {
    const categories = regionPackFlavorCategories("dublin");
    const ids = categories.map((category) => category.id);

    expect(ids).toEqual([...DUBLIN_FLAVOR_IDS]);
    expect(new Set(ids).size).toBe(ids.length);

    for (const category of categories) {
      expect(category.overpassSelectors.length).toBeGreaterThan(0);
      for (const selector of category.overpassSelectors) {
        expect(selector.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
