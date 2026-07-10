import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  buildBundledGamePresets,
  mergeBundledPresets,
} from "./bundledGamePresets";

describe("bundledGamePresets", () => {
  it("defines five Dublin presets", () => {
    expect(BUNDLED_GAME_PRESET_DEFINITIONS).toHaveLength(5);
    expect(BUNDLED_GAME_PRESET_DEFINITIONS.map((preset) => preset.id)).toEqual([
      "bundled:dublin-county",
      "bundled:dublin-city",
      "bundled:dublin-fingal",
      "bundled:dublin-south-dublin",
      "bundled:dublin-dlr",
    ]);
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
    expect(merged.filter((preset) => preset.bundled)).toHaveLength(5);
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
