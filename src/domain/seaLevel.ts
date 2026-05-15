import type { Feature, Polygon, MultiPolygon } from "geojson";
import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import union from "@turf/union";
import type { GameArea } from "./annotations";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  isPointInGameArea,
  buildMeasuringEliminationRegion,
  type LatLngTuple,
} from "./geometry";
import type { MeasuringAnswer } from "./measuringQuestions";

export interface ElevationSampleCell {
  point: LatLngTuple;
  south: number;
  west: number;
  north: number;
  east: number;
}

const MAX_SEA_LEVEL_SAMPLE_CELLS = 250;
const DEFAULT_SEA_LEVEL_DIVISIONS = 20;
const MIN_GAME_AREA_LAT_SPAN = 0.005;
const MIN_GAME_AREA_LNG_SPAN = 0.005;

export function resolveGameAreaCellDivisions(gameArea: GameArea): number {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latSpan = north - south;
  const lngSpan = east - west;
  const areaRatio =
    (latSpan * lngSpan) / (MIN_GAME_AREA_LAT_SPAN * MIN_GAME_AREA_LNG_SPAN);

  if (areaRatio <= 1) {
    return DEFAULT_SEA_LEVEL_DIVISIONS;
  }

  const targetDivisions = Math.floor(
    Math.sqrt(MAX_SEA_LEVEL_SAMPLE_CELLS / areaRatio),
  );

  return Math.max(8, Math.min(DEFAULT_SEA_LEVEL_DIVISIONS, targetDivisions));
}

export function sampleGameAreaCells(
  gameArea: GameArea,
  divisions = resolveGameAreaCellDivisions(gameArea),
): ElevationSampleCell[] {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const cells: ElevationSampleCell[] = [];

  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      const cellSouth = south + row * latStep;
      const cellNorth = south + (row + 1) * latStep;
      const cellWest = west + col * lngStep;
      const cellEast = west + (col + 1) * lngStep;
      const point: LatLngTuple = [
        (cellSouth + cellNorth) / 2,
        (cellWest + cellEast) / 2,
      ];

      if (!isPointInGameArea(point, gameArea)) {
        continue;
      }

      cells.push({
        point,
        south: cellSouth,
        west: cellWest,
        north: cellNorth,
        east: cellEast,
      });
    }
  }

  return cells;
}

export function distanceFromSeaLevelMeters(elevationMeters: number): number {
  return Math.abs(elevationMeters);
}

export function buildSeaLevelNearRegionFromSamples(
  cells: ElevationSampleCell[],
  elevations: number[],
  seekerDistanceFromSeaLevelMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (
    cells.length === 0 ||
    elevations.length !== cells.length ||
    seekerDistanceFromSeaLevelMeters < 0
  ) {
    return null;
  }

  const nearCells: Feature<Polygon>[] = [];

  for (let index = 0; index < cells.length; index += 1) {
    const elevation = elevations[index];
    if (!Number.isFinite(elevation)) {
      continue;
    }

    if (
      distanceFromSeaLevelMeters(elevation) > seekerDistanceFromSeaLevelMeters
    ) {
      continue;
    }

    const cell = cells[index];
    nearCells.push(
      bboxPolygon([
        cell.west,
        cell.south,
        cell.east,
        cell.north,
      ]) as Feature<Polygon>,
    );
  }

  if (nearCells.length === 0) {
    return null;
  }

  const nearRegion =
    nearCells.length === 1
      ? nearCells[0]
      : (union(featureCollection(nearCells)) as Feature<
          Polygon | MultiPolygon
        > | null);

  if (
    !nearRegion ||
    (nearRegion.geometry.type !== "Polygon" &&
      nearRegion.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameAreaToPolygon(gameArea), nearRegion],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

export function buildSeaLevelEliminationRegion(
  nearRegion: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}
