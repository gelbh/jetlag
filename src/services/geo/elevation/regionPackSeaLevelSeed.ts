import type { ElevationSampleCell } from "@/domain/geometry/measuring/seaLevel";
import {
  isPackGeoSupported,
  packGeoSeaLevelSeedUrl,
} from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type { CachedSeaLevelSampling } from "../cache";

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

export function bundledSeaLevelSeedToSampling(
  seed: BundledSeaLevelSeed,
): CachedSeaLevelSampling | null {
  if (seed.cells.length === 0) {
    return null;
  }
  const finite = seed.cellElevations.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return null;
  }

  return {
    cells: seed.cells,
    cellElevations: seed.cellElevations,
    divisions: seed.divisions,
    complete: seed.complete === true,
  };
}

export function clearBundledSeaLevelSeedCacheForTests(): void {
  seedCache.clear();
}
