import type { Feature, Polygon, MultiPolygon, Position } from "geojson";
import intersect from "@turf/intersect";
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
  row: number;
  col: number;
}

const MAX_SEA_LEVEL_SAMPLE_CELLS = 250;
const DEFAULT_SEA_LEVEL_DIVISIONS = 10;
const MAX_SMALL_AREA_DIVISIONS = 30;
const MIN_GAME_AREA_DIVISIONS = 8;
const MIN_GAME_AREA_LAT_SPAN = 0.005;
const MIN_GAME_AREA_LNG_SPAN = 0.005;

type CellClass = "near" | "far" | "skip";

export type SeaLevelEdgeCase = "lowest" | "highest";

export interface SeaLevelNearRegionBuildResult {
  region: Feature<Polygon | MultiPolygon> | null;
  edgeCase: SeaLevelEdgeCase | null;
}

interface MergedRect {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

export function resolveGameAreaCellDivisions(gameArea: GameArea): number {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latSpan = north - south;
  const lngSpan = east - west;
  const areaRatio =
    (latSpan * lngSpan) / (MIN_GAME_AREA_LAT_SPAN * MIN_GAME_AREA_LNG_SPAN);

  if (areaRatio <= 1) {
    const targetDivisions = Math.floor(
      Math.sqrt(MAX_SEA_LEVEL_SAMPLE_CELLS / Math.max(areaRatio, 0.01)),
    );
    return Math.max(
      DEFAULT_SEA_LEVEL_DIVISIONS,
      Math.min(MAX_SMALL_AREA_DIVISIONS, targetDivisions),
    );
  }

  const targetDivisions = Math.floor(
    Math.sqrt(MAX_SEA_LEVEL_SAMPLE_CELLS / areaRatio),
  );

  return Math.max(
    MIN_GAME_AREA_DIVISIONS,
    Math.min(DEFAULT_SEA_LEVEL_DIVISIONS, targetDivisions),
  );
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
        row,
        col,
      });
    }
  }

  return cells;
}

export function distanceFromSeaLevelMeters(elevationMeters: number): number {
  return Math.abs(elevationMeters);
}

function cellRing(
  rect: MergedRect,
  south: number,
  west: number,
  latStep: number,
  lngStep: number,
): Position[] {
  const cellSouth = south + rect.rowStart * latStep;
  const cellNorth = south + rect.rowEnd * latStep;
  const cellWest = west + rect.colStart * lngStep;
  const cellEast = west + rect.colEnd * lngStep;

  return [
    [cellWest, cellSouth],
    [cellEast, cellSouth],
    [cellEast, cellNorth],
    [cellWest, cellNorth],
    [cellWest, cellSouth],
  ];
}

function mergeNearCellRects(
  grid: CellClass[][],
): MergedRect[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const rowRuns: Array<Array<{ colStart: number; colEnd: number }>> = [];

  for (let row = 0; row < height; row += 1) {
    const runs: Array<{ colStart: number; colEnd: number }> = [];
    let runStart = -1;

    for (let col = 0; col <= width; col += 1) {
      const inBounds = col < width;
      const isNear = inBounds && grid[row][col] === "near";

      if (isNear && runStart < 0) {
        runStart = col;
      } else if (!isNear && runStart >= 0) {
        runs.push({ colStart: runStart, colEnd: col });
        runStart = -1;
      }
    }

    rowRuns.push(runs);
  }

  const allRects: MergedRect[] = [];
  const openRects = new Map<string, MergedRect>();

  for (let row = 0; row < height; row += 1) {
    const currentKeys = new Set<string>();

    for (const run of rowRuns[row]) {
      const key = `${run.colStart}:${run.colEnd}`;
      currentKeys.add(key);
      const existing = openRects.get(key);

      if (existing && existing.rowEnd === row) {
        existing.rowEnd = row + 1;
      } else {
        if (existing) {
          allRects.push(existing);
        }
        openRects.set(key, {
          rowStart: row,
          rowEnd: row + 1,
          colStart: run.colStart,
          colEnd: run.colEnd,
        });
      }
    }

    for (const [key, rect] of openRects.entries()) {
      if (!currentKeys.has(key) && rect.rowEnd <= row) {
        allRects.push(rect);
        openRects.delete(key);
      }
    }
  }

  for (const rect of openRects.values()) {
    allRects.push(rect);
  }

  return allRects;
}

function buildNearRegionFromGrid(
  grid: CellClass[][],
  gameArea: GameArea,
  divisions: number,
): Feature<Polygon | MultiPolygon> | null {
  const rects = mergeNearCellRects(grid);
  if (rects.length === 0) {
    return null;
  }

  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const coordinates = rects.map((rect) => [
    cellRing(rect, south, west, latStep, lngStep),
  ]);

  const nearRegion: Feature<MultiPolygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates,
    },
  };

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

export function buildSeaLevelNearRegionFromSamples(
  cells: ElevationSampleCell[],
  elevations: number[],
  seekerDistanceFromSeaLevelMeters: number,
  gameArea: GameArea,
  divisions = resolveGameAreaCellDivisions(gameArea),
): SeaLevelNearRegionBuildResult {
  if (
    cells.length === 0 ||
    elevations.length !== cells.length ||
    seekerDistanceFromSeaLevelMeters < 0
  ) {
    return { region: null, edgeCase: null };
  }

  const grid: CellClass[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => "skip" as CellClass),
  );

  let finiteCount = 0;
  let nearCount = 0;

  for (let index = 0; index < cells.length; index += 1) {
    const elevation = elevations[index];
    const cell = cells[index];

    if (!Number.isFinite(elevation)) {
      continue;
    }

    finiteCount += 1;
    const isNear =
      distanceFromSeaLevelMeters(elevation) <= seekerDistanceFromSeaLevelMeters;

    if (isNear) {
      nearCount += 1;
      grid[cell.row][cell.col] = "near";
    } else {
      grid[cell.row][cell.col] = "far";
    }
  }

  if (nearCount === 0) {
    return { region: null, edgeCase: "lowest" };
  }

  const edgeCase =
    finiteCount > 0 && nearCount === finiteCount ? "highest" : null;
  const region = buildNearRegionFromGrid(grid, gameArea, divisions);

  return { region, edgeCase };
}

export function buildSeaLevelEliminationRegion(
  nearRegion: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}
