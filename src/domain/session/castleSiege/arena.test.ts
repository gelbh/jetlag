import { describe, expect, it, vi } from "vitest";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import { ZERO_GAME_AREA } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { arenaFromGameArea, arenaFromRegionPack, InvalidCastleSiegeArenaError } from "./arena";

const TINY_DEGENERATE_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.26, 53.35],
      [-6.26, 53.35],
      [-6.26, 53.35],
      [-6.26, 53.35],
    ],
  ],
};

describe("arenaFromGameArea", () => {
  it("imports a session gameArea as an arena polygon with gameArea source", () => {
    const arena = arenaFromGameArea(DUBLIN_CITY_GAME_AREA);

    expect(arena.polygon).toEqual(DUBLIN_CITY_GAME_AREA);
    expect(arena.source).toBe("gameArea");
    expect(arena.regionPackId).toBeUndefined();
  });

  it("exposes finite positive bounds matching the gameArea", () => {
    const arena = arenaFromGameArea(DUBLIN_CITY_GAME_AREA);
    const bounds = gameAreaToBoundingBox(arena.polygon);

    expect(bounds.north).toBeGreaterThan(bounds.south);
    expect(bounds.east).toBeGreaterThan(bounds.west);
    expect(bounds).toEqual(gameAreaToBoundingBox(DUBLIN_CITY_GAME_AREA));
  });

  it("rejects placeholder zero gameArea", () => {
    expect(() => arenaFromGameArea(ZERO_GAME_AREA)).toThrow(InvalidCastleSiegeArenaError);
  });

  it("rejects degenerate empty-span polygons", () => {
    expect(() => arenaFromGameArea(TINY_DEGENERATE_AREA)).toThrow(InvalidCastleSiegeArenaError);
  });
});

describe("arenaFromRegionPack", () => {
  it("builds an arena from a pack play area via the region pack loader", async () => {
    const loadPlayArea = vi.fn(async () => DUBLIN_CITY_GAME_AREA);

    const arena = await arenaFromRegionPack("dublin", {
      subregionId: "dcc",
      loadPlayArea,
    });

    expect(loadPlayArea).toHaveBeenCalledWith("dublin", "dcc");
    expect(arena.polygon).toEqual(DUBLIN_CITY_GAME_AREA);
    expect(arena.source).toBe("regionPack");
    expect(arena.regionPackId).toBe("dublin");
    expect(arena.subregionId).toBe("dcc");
  });

  it("rejects pack play areas that fail bounds sanity", async () => {
    await expect(
      arenaFromRegionPack("dublin", {
        loadPlayArea: async () => TINY_DEGENERATE_AREA,
      }),
    ).rejects.toBeInstanceOf(InvalidCastleSiegeArenaError);
  });
});
