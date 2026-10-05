import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { defaultAdvancedSessionSettings } from "../tools/advancedSessionSettings";
import type { GamePreset } from "./gamePreset";
import { GAME_PRESET_SCHEMA_VERSION } from "./gamePreset";
import { suggestPresetDataReuseForGameArea } from "./presetDataReuse";

function boxPolygon(south: number, west: number, north: number, east: number): GameArea {
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

function level8FeatureCollectionJson(id: string, polygon: GameArea): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id,
        properties: { id, name: id },
        geometry: polygon,
      },
    ],
  });
}

function basePreset(partial: Partial<GamePreset> & Pick<GamePreset, "id" | "name">): GamePreset {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: GAME_PRESET_SCHEMA_VERSION,
    gameSize: "medium",
    distanceUnit: "metric",
    advancedSettings: defaultAdvancedSessionSettings("medium", "metric"),
    migrationStatus: "ok",
    ...partial,
  };
}

describe("suggestPresetDataReuseForGameArea", () => {
  it("attaches pack and in-area pins from a qualifying custom preset", () => {
    const preset = basePreset({
      id: "custom-dublin",
      name: "My Dublin",
      gameArea: DUBLIN_CITY_GAME_AREA,
      regionPackId: "dublin",
      transitMetroId: "dublin",
      gameSize: "large",
      customLocationPins: [
        { id: "in", name: "In", point: [53.35, -6.26] },
        { id: "out", name: "Out", point: [0, 0] },
      ],
      customCategories: [
        { id: "custom:x", label: "X", promptNoun: "X", overpassSelectors: ["nwr"] },
      ],
    });
    const suggestion = suggestPresetDataReuseForGameArea(DUBLIN_CITY_GAME_AREA, [preset]);
    expect(suggestion.regionPackId).toBe("dublin");
    expect(suggestion.transitMetroId).toBe("dublin");
    expect(suggestion.customLocationPins?.map((pin) => pin.id)).toEqual(["in"]);
    expect(suggestion.sourcePresetIds).toEqual(["custom-dublin"]);
  });

  it("ignores a graze below α/β", () => {
    const tiny = boxPolygon(53.3, -6.3, 53.30005, -6.29995);
    const preset = basePreset({
      id: "huge",
      name: "Huge",
      gameArea: boxPolygon(40, -10, 60, 10),
      regionPackId: "dublin",
      customLocationPins: [{ id: "p", name: "P", point: [53.35, -6.26] }],
    });
    const suggestion = suggestPresetDataReuseForGameArea(tiny, [preset]);
    expect(suggestion.regionPackId).toBeUndefined();
    expect(suggestion.customLocationPins ?? []).toEqual([]);
    expect(suggestion.sourcePresetIds).toEqual([]);
  });

  it("unions pins from all qualifiers and picks higher-score pack", () => {
    const a = basePreset({
      id: "a",
      name: "A",
      gameArea: boxPolygon(53.2, -6.5, 53.5, -6.0),
      regionPackId: "dublin",
      customLocationPins: [{ id: "a1", name: "A1", point: [53.35, -6.26] }],
    });
    const b = basePreset({
      id: "b",
      name: "B",
      gameArea: boxPolygon(53.3, -6.4, 53.4, -6.1),
      regionPackId: "dublin",
      subregionId: "dcc",
      customLocationPins: [{ id: "b1", name: "B1", point: [53.34, -6.25] }],
    });
    const framed = boxPolygon(53.32, -6.35, 53.38, -6.2);
    const suggestion = suggestPresetDataReuseForGameArea(framed, [a, b]);
    expect(suggestion.customLocationPins?.map((pin) => pin.id).sort()).toEqual(["a1", "b1"]);
    // tighter bbox → higher score → b wins pack fields
    expect(suggestion.subregionId).toBe("dcc");
    expect(suggestion.sourcePresetIds.sort()).toEqual(["a", "b"]);
  });

  it("excludes loaded preset and upgrades pack only on strict score beat", () => {
    const loaded = basePreset({
      id: "loaded",
      name: "Loaded",
      gameArea: boxPolygon(53.2, -6.5, 53.5, -6.0),
      regionPackId: "dublin",
      customLocationPins: [{ id: "loaded-pin", name: "L", point: [53.35, -6.26] }],
    });
    const other = basePreset({
      id: "other",
      name: "Other",
      gameArea: boxPolygon(53.3, -6.4, 53.4, -6.1),
      regionPackId: "dublin",
      subregionId: "fingal",
      customLocationPins: [{ id: "other-pin", name: "O", point: [53.34, -6.25] }],
    });
    const framed = boxPolygon(53.32, -6.35, 53.38, -6.2);
    const suggestion = suggestPresetDataReuseForGameArea(framed, [loaded, other], {
      excludePresetIds: ["loaded"],
    });
    expect(suggestion.customLocationPins?.map((pin) => pin.id)).toEqual(["other-pin"]);
    expect(suggestion.sourcePresetIds).toEqual(["other"]);
    // other is tighter → score > loaded → pack fields from other
    expect(suggestion.subregionId).toBe("fingal");
  });

  it("qualifies bundled presets via pack reference bbox", () => {
    const bundled = basePreset({
      id: "bundled:dublin-city",
      name: "Dublin City",
      bundled: true,
      regionPackId: "dublin",
      subregionId: "dcc",
      transitMetroId: "dublin",
    });
    const suggestion = suggestPresetDataReuseForGameArea(DUBLIN_CITY_GAME_AREA, [bundled]);
    expect(suggestion.regionPackId).toBe("dublin");
    expect(suggestion.transitMetroId).toBe("dublin");
  });

  it("does not surface customCategories", () => {
    const preset = basePreset({
      id: "c",
      name: "C",
      gameArea: DUBLIN_CITY_GAME_AREA,
      regionPackId: "dublin",
      customCategories: [
        { id: "custom:x", label: "X", promptNoun: "X", overpassSelectors: ["nwr"] },
      ],
    });
    const suggestion = suggestPresetDataReuseForGameArea(DUBLIN_CITY_GAME_AREA, [preset]);
    expect(suggestion).not.toHaveProperty("customCategories");
  });

  it("merges intersecting level-8 matching areas from qualifiers", () => {
    const polyA = boxPolygon(53.33, -6.34, 53.36, -6.28);
    const polyB = boxPolygon(53.34, -6.3, 53.37, -6.22);
    const a = basePreset({
      id: "match-a",
      name: "Match A",
      gameArea: boxPolygon(53.2, -6.5, 53.5, -6.0),
      regionPackId: "dublin",
      customMatchingAreas: {
        8: level8FeatureCollectionJson("feat-a", polyA),
      },
    });
    const b = basePreset({
      id: "match-b",
      name: "Match B",
      gameArea: boxPolygon(53.3, -6.4, 53.4, -6.1),
      regionPackId: "dublin",
      customMatchingAreas: {
        8: level8FeatureCollectionJson("feat-b", polyB),
      },
    });
    const framed = boxPolygon(53.32, -6.35, 53.38, -6.2);
    const suggestion = suggestPresetDataReuseForGameArea(framed, [a, b]);
    expect(suggestion.customMatchingAreas?.[8]).toBeDefined();
    const merged = JSON.parse(suggestion.customMatchingAreas![8]!) as {
      type: string;
      features: Array<{ id?: string; properties?: { id?: string } }>;
    };
    expect(merged.type).toBe("FeatureCollection");
    const ids = merged.features
      .map((feature) => feature.id ?? feature.properties?.id)
      .filter((id): id is string => typeof id === "string")
      .sort();
    expect(ids).toEqual(["feat-a", "feat-b"]);
  });
});
