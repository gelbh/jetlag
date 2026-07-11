import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  buildBundledGamePresets,
  mergeBundledPresets,
} from "./bundledGamePresets";

describe("bundledGamePresets", () => {
  it("defines Dublin and Hide+Seek show metro presets", () => {
    expect(BUNDLED_GAME_PRESET_DEFINITIONS.length).toBeGreaterThan(90);
    expect(BUNDLED_GAME_PRESET_DEFINITIONS.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        "bundled:dublin-county",
        "bundled:nyc",
        "bundled:nyc-manhattan",
        "bundled:london",
        "bundled:tokyo",
        "bundled:osaka",
        "bundled:zurich-city",
        "bundled:lucerne-metro",
      ]),
    );
  });

  it("keeps bundled presets ahead of user presets", () => {
    const merged = mergeBundledPresets([
      {
        id: "user-1",
        name: "Mine",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        schemaVersion: 1,
        gameSize: "small",
        distanceUnit: "imperial",
        advancedSettings: buildBundledGamePresets()[0]!.advancedSettings,
        migrationStatus: "ok",
      },
    ]);

    expect(merged[0]?.bundled).toBe(true);
    expect(merged.at(-1)?.id).toBe("user-1");
    expect(merged.filter((preset) => preset.bundled).length).toBe(
      BUNDLED_GAME_PRESET_DEFINITIONS.length,
    );
  });

  it("applies preset tuning to bundled game presets", () => {
    const nyc = buildBundledGamePresets().find((preset) => preset.id === "bundled:nyc");
    expect(nyc?.distanceUnit).toBe("imperial");
    expect(nyc?.transitMetroId).toBe("nyc");
    expect(nyc?.advancedSettings.expansionPackEnabled).toBe(true);
  });
});

describe("Dublin GeoJSON asset counts", () => {
  it("ships four councils and thirty-one LEAs", () => {
    const councils = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/dublin/councils.geojson"),
        "utf8",
      ),
    );
    const leas = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/dublin/leas.geojson"),
        "utf8",
      ),
    );

    expect(councils.features).toHaveLength(4);
    expect(leas.features).toHaveLength(31);
  });
});

describe("NYC GeoJSON asset counts", () => {
  it("ships five boroughs and community districts", () => {
    const boroughs = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/nyc/boroughs.geojson"),
        "utf8",
      ),
    );
    const districts = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/nyc/districts.geojson"),
        "utf8",
      ),
    );

    expect(boroughs.features).toHaveLength(5);
    expect(districts.features.length).toBeGreaterThanOrEqual(59);
  });
});
