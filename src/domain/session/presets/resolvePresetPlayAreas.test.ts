import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { defaultAdvancedSessionSettings } from "../tools/advancedSessionSettings";
import { GAME_PRESET_SCHEMA_VERSION, type GamePreset } from "./gamePreset";
import { resolvePresetPlayAreas } from "./resolvePresetPlayAreas";

const areaA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-8.6, 51.8],
      [-8.3, 51.8],
      [-8.3, 52.0],
      [-8.6, 52.0],
      [-8.6, 51.8],
    ],
  ],
};
const areaB: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.1, 53.3],
      [-6.1, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
};

function preset(partial: Partial<GamePreset> & Pick<GamePreset, "id" | "name">): GamePreset {
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

describe("resolvePresetPlayAreas", () => {
  it("returns inline areas in order for N=2", async () => {
    const map = new Map([
      ["a", preset({ id: "a", name: "A", gameArea: areaA })],
      ["b", preset({ id: "b", name: "B", gameArea: areaB })],
    ]);
    const result = await resolvePresetPlayAreas(map, ["a", "b"]);
    expect(result).toEqual({ ok: true, areas: [areaA, areaB] });
  });

  it("loads pack playArea for a secondary without inline gameArea", async () => {
    const packArea = areaB;
    const loadBoundaries = vi.fn(async () => ({
      playArea: packArea,
      customMatchingAreas: {},
    }));
    const map = new Map([
      ["a", preset({ id: "a", name: "A", gameArea: areaA })],
      [
        "b",
        preset({
          id: "b",
          name: "B",
          regionPackId: "sydney",
          subregionId: "17200",
        }),
      ],
    ]);
    const result = await resolvePresetPlayAreas(map, ["a", "b"], loadBoundaries as never);
    expect(result).toEqual({ ok: true, areas: [areaA, packArea] });
    expect(loadBoundaries).toHaveBeenCalledWith("sydney", "17200");
  });

  it("fails closed when a preset has no area and no pack", async () => {
    const map = new Map([
      ["a", preset({ id: "a", name: "A", gameArea: areaA })],
      ["b", preset({ id: "b", name: "B" })],
    ]);
    const result = await resolvePresetPlayAreas(map, ["a", "b"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.presetId).toBe("b");
    }
  });
});
