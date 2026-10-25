import { describe, expect, it } from "vitest";
import type { SessionCustomCategory } from "../session/catalog/sessionCustomContent";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";
import {
  mergeRegionPackFlavorCategories,
  regionPackFlavorCategories,
  stripKnownRegionPackFlavorCategories,
} from "./regionPackFlavorCategories";

const DUBLIN_FLAVOR_IDS = [
  "custom:dublin-luas-stop",
  "custom:dublin-canal-lock",
  "custom:dublin-gaa-ground",
  "custom:dublin-castle-fort",
] as const;

const NYC_FLAVOR_IDS = [
  "custom:nyc-ferry-terminal",
  "custom:nyc-pizza",
  "custom:nyc-basketball-court",
  "custom:nyc-deli",
] as const;

const APPROVED_FLAVOR_PACKS = new Set<RegionPackId>(["dublin", "nyc"]);

const HOST_CUSTOM: SessionCustomCategory = {
  id: "custom:host-brewery",
  label: "Brewery",
  promptNoun: "a brewery",
  overpassSelectors: ['["craft"="brewery"]'],
};

describe("regionPackFlavorCategories", () => {
  it("returns a readonly array for every region pack id", () => {
    for (const packId of REGION_PACK_IDS) {
      const categories = regionPackFlavorCategories(packId);
      expect(Array.isArray(categories)).toBe(true);
    }
  });

  it("returns empty for every unapproved pack", () => {
    const unapproved = REGION_PACK_IDS.filter(
      (id): id is RegionPackId => !APPROVED_FLAVOR_PACKS.has(id),
    );
    for (const packId of unapproved) {
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

  it("returns the locked NYC flavor categories", () => {
    const categories = regionPackFlavorCategories("nyc");

    expect(categories).toEqual([
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
    ]);
  });

  it("uses unique NYC flavor ids with non-empty selectors", () => {
    const categories = regionPackFlavorCategories("nyc");
    const ids = categories.map((category) => category.id);

    expect(ids).toEqual([...NYC_FLAVOR_IDS]);
    expect(new Set(ids).size).toBe(ids.length);

    for (const category of categories) {
      expect(category.overpassSelectors.length).toBeGreaterThan(0);
      for (const selector of category.overpassSelectors) {
        expect(selector.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("mergeRegionPackFlavorCategories", () => {
  it("keeps host customs and appends Dublin flavor without wiping either", () => {
    const merged = mergeRegionPackFlavorCategories([HOST_CUSTOM], "dublin");
    const ids = merged.map((category) => category.id);

    expect(ids).toEqual(["custom:host-brewery", ...DUBLIN_FLAVOR_IDS]);
    expect(merged[0]).toEqual(HOST_CUSTOM);
  });

  it("keeps host customs and appends NYC flavor without wiping either", () => {
    const merged = mergeRegionPackFlavorCategories([HOST_CUSTOM], "nyc");
    const ids = merged.map((category) => category.id);

    expect(ids).toEqual(["custom:host-brewery", ...NYC_FLAVOR_IDS]);
    expect(merged[0]).toEqual(HOST_CUSTOM);
  });

  it("replaces prior pack flavor ids with the locked pack list", () => {
    const existing = [
      HOST_CUSTOM,
      {
        id: "custom:dublin-luas-stop",
        label: "Host Luas",
        promptNoun: "a Luas stop",
        overpassSelectors: ['["railway"="tram_stop"]'],
      },
    ] as const;
    const merged = mergeRegionPackFlavorCategories(existing, "dublin");
    const luasMatches = merged.filter((category) => category.id === "custom:dublin-luas-stop");

    expect(luasMatches).toHaveLength(1);
    expect(luasMatches[0]?.label).toBe("Luas stop");
    expect(merged.map((category) => category.id)).toEqual([
      "custom:host-brewery",
      ...DUBLIN_FLAVOR_IDS,
    ]);
  });

  it("does not invent flavor for unapproved packs", () => {
    expect(mergeRegionPackFlavorCategories([HOST_CUSTOM], "london")).toEqual([HOST_CUSTOM]);
    expect(mergeRegionPackFlavorCategories([], "london")).toEqual([]);
  });

  it("replaces Dublin flavor with NYC flavor when switching packs", () => {
    const dublinMerged = mergeRegionPackFlavorCategories([HOST_CUSTOM], "dublin");
    const nycMerged = mergeRegionPackFlavorCategories(dublinMerged, "nyc");

    expect(nycMerged.map((category) => category.id)).toEqual([
      "custom:host-brewery",
      ...NYC_FLAVOR_IDS,
    ]);
    expect(stripKnownRegionPackFlavorCategories(dublinMerged).map((c) => c.id)).toEqual([
      "custom:host-brewery",
    ]);
  });

  it("keeps host customs whose ids look like custom:<packId>-*", () => {
    const hostLondonBridge: SessionCustomCategory = {
      id: "custom:london-bridge",
      label: "London Bridge",
      promptNoun: "a London Bridge",
      overpassSelectors: ['["name"="London Bridge"]'],
    };

    const merged = mergeRegionPackFlavorCategories([hostLondonBridge], "dublin");
    expect(merged.map((category) => category.id)).toEqual([
      "custom:london-bridge",
      ...DUBLIN_FLAVOR_IDS,
    ]);
    expect(stripKnownRegionPackFlavorCategories(merged).map((c) => c.id)).toEqual([
      "custom:london-bridge",
    ]);
  });
});
