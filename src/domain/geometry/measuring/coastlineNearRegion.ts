import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../map/annotations";
import { gameAreaToBoundingBox } from "../gameArea/geometryCore";
import {
  buildMeasuringNearRegionFromCellGrid,
  resolveGameAreaCellDivisions,
  sampleGameAreaCells,
} from "./seaLevel";
import {
  COASTLINE_NEAR_REGION_YIELD_EVERY,
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
  type PreparedLinearSegments,
  yieldCoastlineNearRegionBuild,
} from "./nearRegions";

type CellClass = "near" | "far" | "skip";

export interface CoastlineNearRegionDistanceThresholdOptions {
  divisions?: number;
}

/** Grid discretization slack for membership oracle (half cell diagonal + 1 m). */
export function coastlineNearRegionOracleEpsilonMeters(
  gameArea: GameArea,
  divisions: number,
): number {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const midLat = (south + north) / 2;
  const latMeters = latStep * 111_320;
  const lngMeters = lngStep * 111_320 * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(latMeters, lngMeters) / 2 + 1;
}

export function assertCoastlineNearRegionOracle(
  polygon: Feature<Polygon | MultiPolygon>,
  prepared: PreparedLinearSegments,
  radiusMeters: number,
  gameArea: GameArea,
  epsilonMeters: number,
  divisions = resolveGameAreaCellDivisions(gameArea),
): void {
  const cells = sampleGameAreaCells(gameArea, divisions);
  const limit = radiusMeters + epsilonMeters;

  for (const cell of cells) {
    const probe = turfPoint([cell.point[1], cell.point[0]]);
    if (!booleanPointInPolygon(probe, polygon)) {
      continue;
    }

    const nearest = nearestPointToCoastlines(cell.point, prepared.segments, prepared);
    const distanceMeters = nearest?.distanceMeters ?? Infinity;
    if (distanceMeters > limit) {
      throw new Error(
        `Coastline near-region oracle violation at [${cell.point[0]}, ${cell.point[1]}]: nearest=${distanceMeters.toFixed(1)}m > R+ε=${limit.toFixed(1)}m`,
      );
    }
  }
}

export async function buildCoastlineNearRegionDistanceThreshold(
  segments: Feature<LineString>[],
  radiusMeters: number,
  gameArea: GameArea,
  options: CoastlineNearRegionDistanceThresholdOptions = {},
): Promise<Feature<Polygon | MultiPolygon> | null> {
  if (segments.length === 0 || radiusMeters <= 0) {
    return null;
  }

  const prepared = prepareMeasuringLineSegments(segments, gameArea);
  if (prepared.segments.length === 0) {
    return null;
  }

  const divisions = options.divisions ?? resolveGameAreaCellDivisions(gameArea);
  const cells = sampleGameAreaCells(gameArea, divisions);
  const grid: CellClass[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => "skip" as CellClass),
  );

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!;
    const nearest = nearestPointToCoastlines(cell.point, prepared.segments, prepared);
    const distanceMeters = nearest?.distanceMeters ?? Infinity;

    if (distanceMeters <= radiusMeters) {
      grid[cell.row][cell.col] = "near";
    } else {
      grid[cell.row][cell.col] = "far";
    }

    if ((index + 1) % COASTLINE_NEAR_REGION_YIELD_EVERY === 0 && index + 1 < cells.length) {
      await yieldCoastlineNearRegionBuild();
    }
  }

  return buildMeasuringNearRegionFromCellGrid(grid, gameArea, divisions);
}
