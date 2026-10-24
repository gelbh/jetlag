import { gameAreaToBoundingBoxRaw } from "@/domain/geometry/gameArea/gameAreaBounds";
import { boundingBoxHasMinimumSpan } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { RegionPackId } from "@/domain/regions/regionPack";
import { loadRegionPackPlayArea } from "@/services/geo/matching/regionPackBoundaries";

export type CastleSiegeArenaPolygon = GameArea;

export type CastleSiegeArenaSource = "gameArea" | "regionPack" | "drawn";

export type CastleSiegeArena = {
  polygon: CastleSiegeArenaPolygon;
  source: CastleSiegeArenaSource;
  regionPackId?: RegionPackId;
  subregionId?: string;
};

export type RegionPackPlayAreaLoader = (
  packId: RegionPackId,
  subregionId?: string,
) => Promise<GameArea>;

export class InvalidCastleSiegeArenaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCastleSiegeArenaError";
  }
}

function assertUsableArenaPolygon(gameArea: GameArea): void {
  if (gameArea.type !== "Polygon" && gameArea.type !== "MultiPolygon") {
    throw new InvalidCastleSiegeArenaError("Arena must be a polygon.");
  }

  const rings =
    gameArea.type === "Polygon"
      ? gameArea.coordinates
      : gameArea.coordinates.flatMap((polygon) => polygon);

  if (rings.length === 0 || !rings.some((ring) => ring.length >= 4)) {
    throw new InvalidCastleSiegeArenaError("Arena polygon has no usable ring.");
  }

  const bounds = gameAreaToBoundingBoxRaw(gameArea);
  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east) ||
    !boundingBoxHasMinimumSpan(bounds)
  ) {
    throw new InvalidCastleSiegeArenaError("Arena bounds are empty or below minimum span.");
  }
}

export function arenaFromGameArea(gameArea: GameArea): CastleSiegeArena {
  assertUsableArenaPolygon(gameArea);
  return {
    polygon: gameArea,
    source: "gameArea",
  };
}

export type ArenaFromRegionPackOptions = {
  subregionId?: string;
  loadPlayArea?: RegionPackPlayAreaLoader;
};

export async function arenaFromRegionPack(
  packId: RegionPackId,
  options: ArenaFromRegionPackOptions = {},
): Promise<CastleSiegeArena> {
  const loadPlayArea = options.loadPlayArea ?? loadRegionPackPlayArea;
  const playArea = await loadPlayArea(packId, options.subregionId);
  assertUsableArenaPolygon(playArea);
  return {
    polygon: playArea,
    source: "regionPack",
    regionPackId: packId,
    ...(options.subregionId !== undefined ? { subregionId: options.subregionId } : {}),
  };
}
