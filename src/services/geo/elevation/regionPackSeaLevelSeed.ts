import type { GameArea } from "@/domain/map/annotations";
import {
  resolveFineSeaLevelDivisions,
  sampleGameAreaCells,
  type ElevationSampleCell,
} from "@/domain/geometry/measuring/seaLevel";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  isPackGeoSupported,
  packGeoSeaLevelSeedUrl,
} from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type { CachedSeaLevelSampling } from "../cache";

/** Require most session cells to resolve from the pack seed before dual-phase. */
const MIN_SEED_COVERAGE_RATIO = 0.5;

export interface BundledSeaLevelSeed {
  source: string;
  bbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  divisions: number;
  cells: ElevationSampleCell[];
  cellElevations: number[];
  complete: boolean;
}

const seedCache = new Map<string, BundledSeaLevelSeed | null>();

function resolveGeoAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

function isElevationSampleCell(value: unknown): value is ElevationSampleCell {
  if (!value || typeof value !== "object") {
    return false;
  }
  const cell = value as ElevationSampleCell;
  return (
    Array.isArray(cell.point) &&
    cell.point.length === 2 &&
    typeof cell.south === "number" &&
    typeof cell.west === "number" &&
    typeof cell.north === "number" &&
    typeof cell.east === "number" &&
    typeof cell.row === "number" &&
    typeof cell.col === "number"
  );
}

export async function loadBundledSeaLevelSeed(
  regionPackId: RegionPackId,
): Promise<BundledSeaLevelSeed | null> {
  if (!isPackGeoSupported(regionPackId, "sea_level_seed")) {
    return null;
  }

  if (seedCache.has(regionPackId)) {
    return seedCache.get(regionPackId) ?? null;
  }

  try {
    const response = await fetch(
      resolveGeoAssetUrl(packGeoSeaLevelSeedUrl(regionPackId)),
    );
    if (!response.ok) {
      seedCache.set(regionPackId, null);
      return null;
    }

    const payload = (await response.json()) as {
      source?: string;
      bbox?: BundledSeaLevelSeed["bbox"];
      divisions?: number;
      cells?: unknown[];
      cellElevations?: unknown[];
      complete?: boolean;
    };

    if (
      typeof payload.source !== "string" ||
      typeof payload.divisions !== "number" ||
      !Array.isArray(payload.cells) ||
      !Array.isArray(payload.cellElevations)
    ) {
      seedCache.set(regionPackId, null);
      return null;
    }

    const cells = payload.cells.filter(isElevationSampleCell);
    const cellElevations = payload.cellElevations.map((value) =>
      typeof value === "number" ? value : Number.NaN,
    );

    if (cells.length === 0 || cellElevations.length !== cells.length) {
      const empty: BundledSeaLevelSeed = {
        source: payload.source,
        bbox: payload.bbox,
        divisions: payload.divisions,
        cells: [],
        cellElevations: [],
        complete: false,
      };
      seedCache.set(regionPackId, empty);
      return empty;
    }

    const seed: BundledSeaLevelSeed = {
      source: payload.source,
      bbox: payload.bbox,
      divisions: payload.divisions,
      cells,
      cellElevations,
      complete: payload.complete === true,
    };
    seedCache.set(regionPackId, seed);
    return seed;
  } catch {
    seedCache.set(regionPackId, null);
    return null;
  }
}

function lookupSeedElevation(
  seed: BundledSeaLevelSeed,
  point: LatLngTuple,
): number {
  // Containment only — nearest-fill would invent pack elevations outside the
  // seed footprint and green-wash sparse/stub seeds.
  for (let index = 0; index < seed.cells.length; index += 1) {
    const cell = seed.cells[index];
    if (
      point[0] >= cell.south &&
      point[0] <= cell.north &&
      point[1] >= cell.west &&
      point[1] <= cell.east
    ) {
      return seed.cellElevations[index] ?? Number.NaN;
    }
  }
  return Number.NaN;
}

/**
 * Remap pack-bbox seed elevations onto the session gameArea sampling grid.
 * Near-region build places cells by row/col on the session bbox — never return
 * pack-native cells for a different play area.
 */
export function remapBundledSeaLevelSeedToGameArea(
  seed: BundledSeaLevelSeed,
  gameArea: GameArea,
): CachedSeaLevelSampling | null {
  if (seed.cells.length === 0 || seed.divisions < 1) {
    return null;
  }

  const sessionCells = sampleGameAreaCells(gameArea, seed.divisions);
  if (sessionCells.length === 0) {
    return null;
  }

  const cellElevations = sessionCells.map((cell) =>
    lookupSeedElevation(seed, cell.point),
  );
  const finiteCount = cellElevations.filter((value) =>
    Number.isFinite(value),
  ).length;
  const minCoverage = Math.max(
    1,
    Math.ceil(sessionCells.length * MIN_SEED_COVERAGE_RATIO),
  );
  if (finiteCount < minCoverage) {
    return null;
  }

  const fineDivisions = resolveFineSeaLevelDivisions(gameArea);
  const complete =
    seed.complete === true &&
    seed.divisions >= fineDivisions &&
    finiteCount === sessionCells.length;

  return {
    cells: sessionCells,
    cellElevations,
    divisions: seed.divisions,
    complete,
  };
}

export function clearBundledSeaLevelSeedCacheForTests(): void {
  seedCache.clear();
}
