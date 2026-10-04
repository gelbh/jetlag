import intersect from "@turf/intersect";
import type { Feature, LineString, MultiPolygon, Polygon, Position } from "geojson";
import type { GameArea } from "../../map/annotations";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  type LatLngTuple,
} from "../gameArea/geometryCore";
import { unionPolygonFeatures } from "../kernel/unionPolygonFeatures";
import {
  COASTLINE_NEAR_REGION_YIELD_EVERY,
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
  yieldCoastlineNearRegionBuild,
} from "./nearRegions";
import {
  buildMeasuringNearRegionFromCellGrid,
  LINEAR_NEAR_REGION_FINE_PER_COARSE,
  LINEAR_NEAR_REGION_MAX_FINE_SAMPLES,
  resolveLinearNearRegionCoarseDivisions,
  sampleGameAreaCells,
} from "./seaLevel";

type CellClass = "near" | "far" | "skip";

type MarchingCase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface LinearNearRegionIsolineOptions {
  divisions?: number;
}

export function linearNearRegionFinestDivisions(coarse: number): number {
  return coarse * LINEAR_NEAR_REGION_FINE_PER_COARSE;
}

export async function buildLinearNearRegionIsoline(
  segments: Feature<LineString>[],
  radiusMeters: number,
  gameArea: GameArea,
  options: LinearNearRegionIsolineOptions = {},
): Promise<Feature<Polygon | MultiPolygon> | null> {
  if (segments.length === 0 || radiusMeters <= 0) {
    return null;
  }

  const prepared = prepareMeasuringLineSegments(segments, gameArea);
  if (prepared.segments.length === 0) {
    return null;
  }

  const divisions = options.divisions ?? resolveLinearNearRegionCoarseDivisions(gameArea);
  const cells = sampleGameAreaCells(gameArea, divisions);
  const grid: CellClass[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => "skip" as CellClass),
  );
  const distances: number[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => Number.POSITIVE_INFINITY),
  );

  let queryCount = 0;
  let nearCount = 0;
  let farCount = 0;

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!;
    const nearest = nearestPointToCoastlines(cell.point, prepared.segments, prepared);
    const distanceMeters = nearest?.distanceMeters ?? Number.POSITIVE_INFINITY;
    distances[cell.row][cell.col] = distanceMeters;
    queryCount += 1;

    if (distanceMeters <= radiusMeters) {
      grid[cell.row][cell.col] = "near";
      nearCount += 1;
    } else {
      grid[cell.row][cell.col] = "far";
      farCount += 1;
    }

    if (queryCount % COASTLINE_NEAR_REGION_YIELD_EVERY === 0 && index + 1 < cells.length) {
      await yieldCoastlineNearRegionBuild();
    }
  }

  if (nearCount === 0) {
    return null;
  }

  if (farCount === 0) {
    return clipToGameArea(gameAreaToPolygon(gameArea), gameArea);
  }

  const epsilonMeters = coarseBoundaryEpsilonMeters(gameArea, divisions);
  const boundary = markBoundaryCells(grid, distances, radiusMeters, epsilonMeters, divisions);
  const stamped = stampFineCoarseCells(boundary, divisions);

  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const fineLatStep = latStep / LINEAR_NEAR_REGION_FINE_PER_COARSE;
  const fineLngStep = lngStep / LINEAR_NEAR_REGION_FINE_PER_COARSE;

  const aabb = stampedAabb(stamped);
  const isolineParts: Feature<Polygon | MultiPolygon>[] = [];

  if (aabb) {
    const cornerSouth = aabb.minFineRow;
    const cornerWest = aabb.minFineCol;
    const cornerRows = aabb.maxFineRow - aabb.minFineRow + 2;
    const cornerCols = aabb.maxFineCol - aabb.minFineCol + 2;
    const cornerDistances: number[][] = Array.from({ length: cornerRows }, () =>
      Array.from({ length: cornerCols }, () => Number.POSITIVE_INFINITY),
    );

    for (let cr = 0; cr < cornerRows; cr += 1) {
      for (let cc = 0; cc < cornerCols; cc += 1) {
        const fineRow = cornerSouth + cr;
        const fineCol = cornerWest + cc;
        const point: LatLngTuple = [south + fineRow * fineLatStep, west + fineCol * fineLngStep];
        const nearest = nearestPointToCoastlines(point, prepared.segments, prepared);
        cornerDistances[cr][cc] = nearest?.distanceMeters ?? Number.POSITIVE_INFINITY;
        queryCount += 1;
        if (queryCount % COASTLINE_NEAR_REGION_YIELD_EVERY === 0) {
          await yieldCoastlineNearRegionBuild();
        }
      }
    }

    for (let fineRow = aabb.minFineRow; fineRow <= aabb.maxFineRow; fineRow += 1) {
      for (let fineCol = aabb.minFineCol; fineCol <= aabb.maxFineCol; fineCol += 1) {
        const cr = fineRow - cornerSouth;
        const cc = fineCol - cornerWest;
        const sw: Position = [west + fineCol * fineLngStep, south + fineRow * fineLatStep];
        const se: Position = [west + (fineCol + 1) * fineLngStep, south + fineRow * fineLatStep];
        const ne: Position = [
          west + (fineCol + 1) * fineLngStep,
          south + (fineRow + 1) * fineLatStep,
        ];
        const nw: Position = [west + fineCol * fineLngStep, south + (fineRow + 1) * fineLatStep];
        const rings = marchingSquareFillRings(
          sw,
          se,
          ne,
          nw,
          cornerDistances[cr]![cc]!,
          cornerDistances[cr]![cc + 1]!,
          cornerDistances[cr + 1]![cc + 1]!,
          cornerDistances[cr + 1]![cc]!,
          radiusMeters,
        );
        for (const ring of rings) {
          isolineParts.push(polygonFromRing(ring));
        }
      }
    }
  }

  const interiorGrid: CellClass[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => "skip" as CellClass),
  );
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (grid[row][col] === "near" && !stamped[row]![col] && !boundary[row]![col]) {
        interiorGrid[row][col] = "near";
      }
    }
  }

  const interior = buildMeasuringNearRegionFromCellGrid(interiorGrid, gameArea, divisions);
  const parts = interior ? [...isolineParts, interior] : isolineParts;
  if (parts.length === 0) {
    return null;
  }

  const united = unionPolygonFeatures(parts);
  if (!united) {
    return null;
  }

  return clipToGameArea(united, gameArea);
}

function coarseBoundaryEpsilonMeters(gameArea: GameArea, divisions: number): number {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const midLat = (south + north) / 2;
  const latMeters = latStep * 111_320;
  const lngMeters = lngStep * 111_320 * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(latMeters, lngMeters) / 2 + 1;
}

function markBoundaryCells(
  grid: CellClass[][],
  distances: number[][],
  radiusMeters: number,
  epsilonMeters: number,
  divisions: number,
): boolean[][] {
  const boundary = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => false),
  );
  const neighbors: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      const cellClass = grid[row][col];
      if (cellClass !== "near" && cellClass !== "far") {
        continue;
      }
      if (Math.abs(distances[row][col] - radiusMeters) <= epsilonMeters) {
        boundary[row][col] = true;
        continue;
      }
      for (const [dRow, dCol] of neighbors) {
        const nRow = row + dRow;
        const nCol = col + dCol;
        if (nRow < 0 || nRow >= divisions || nCol < 0 || nCol >= divisions) {
          continue;
        }
        const neighborClass = grid[nRow][nCol];
        if ((neighborClass === "near" || neighborClass === "far") && neighborClass !== cellClass) {
          boundary[row][col] = true;
          break;
        }
      }
    }
  }

  return boundary;
}

function stampFineCoarseCells(boundary: boolean[][], divisions: number): boolean[][] {
  const stamped = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => false),
  );
  const haloOffsets: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const candidates: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (boundary[row][col]) {
        candidates.push({ row, col });
      }
    }
  }
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (boundary[row][col]) {
        continue;
      }
      let inHalo = false;
      for (const [dRow, dCol] of haloOffsets) {
        if (dRow === 0 && dCol === 0) {
          continue;
        }
        const nRow = row + dRow;
        const nCol = col + dCol;
        if (nRow < 0 || nRow >= divisions || nCol < 0 || nCol >= divisions) {
          continue;
        }
        if (boundary[nRow][nCol]) {
          inHalo = true;
          break;
        }
      }
      if (inHalo) {
        candidates.push({ row, col });
      }
    }
  }

  let fineSamples = 0;
  const finePerCell = LINEAR_NEAR_REGION_FINE_PER_COARSE * LINEAR_NEAR_REGION_FINE_PER_COARSE;
  for (const candidate of candidates) {
    if (fineSamples + finePerCell > LINEAR_NEAR_REGION_MAX_FINE_SAMPLES) {
      break;
    }
    stamped[candidate.row][candidate.col] = true;
    fineSamples += finePerCell;
  }

  return stamped;
}

function stampedAabb(stamped: boolean[][]): {
  minFineRow: number;
  maxFineRow: number;
  minFineCol: number;
  maxFineCol: number;
} | null {
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < stamped.length; row += 1) {
    for (let col = 0; col < (stamped[row]?.length ?? 0); col += 1) {
      if (!stamped[row]![col]) {
        continue;
      }
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (!Number.isFinite(minRow)) {
    return null;
  }

  return {
    minFineRow: minRow * LINEAR_NEAR_REGION_FINE_PER_COARSE,
    maxFineRow: (maxRow + 1) * LINEAR_NEAR_REGION_FINE_PER_COARSE - 1,
    minFineCol: minCol * LINEAR_NEAR_REGION_FINE_PER_COARSE,
    maxFineCol: (maxCol + 1) * LINEAR_NEAR_REGION_FINE_PER_COARSE - 1,
  };
}

function interpolateCrossing(
  from: Position,
  fromDistance: number,
  to: Position,
  toDistance: number,
  iso: number,
): Position {
  const span = toDistance - fromDistance;
  const t = Math.abs(span) < 1e-12 ? 0.5 : (iso - fromDistance) / span;
  const clamped = Math.min(1, Math.max(0, t));
  return [from[0] + clamped * (to[0] - from[0]), from[1] + clamped * (to[1] - from[1])];
}

function closeRing(ring: Position[]): Position[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, first];
}

function polygonFromRing(ring: Position[]): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [closeRing(ring)],
    },
  };
}

function clipToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  try {
    const clipped = intersect({
      type: "FeatureCollection",
      features: [gameAreaToPolygon(gameArea), feature],
    });
    if (
      clipped &&
      (clipped.geometry.type === "Polygon" || clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    return null;
  }
  return null;
}

function marchingSquareFillRings(
  sw: Position,
  se: Position,
  ne: Position,
  nw: Position,
  dSw: number,
  dSe: number,
  dNe: number,
  dNw: number,
  iso: number,
): Position[][] {
  const swIn = dSw <= iso;
  const seIn = dSe <= iso;
  const neIn = dNe <= iso;
  const nwIn = dNw <= iso;
  const code = ((swIn ? 1 : 0) | (seIn ? 2 : 0) | (neIn ? 4 : 0) | (nwIn ? 8 : 0)) as MarchingCase;
  const bottom = () => interpolateCrossing(sw, dSw, se, dSe, iso);
  const right = () => interpolateCrossing(se, dSe, ne, dNe, iso);
  const top = () => interpolateCrossing(ne, dNe, nw, dNw, iso);
  const left = () => interpolateCrossing(nw, dNw, sw, dSw, iso);
  const saddleInside = (dSw + dSe + dNe + dNw) / 4 <= iso;

  switch (code) {
    case 0:
      return [];
    case 1:
      return [[sw, bottom(), left()]];
    case 2:
      return [[se, right(), bottom()]];
    case 3:
      return [[sw, se, right(), left()]];
    case 4:
      return [[ne, top(), right()]];
    case 5:
      if (saddleInside) {
        return [[sw, bottom(), right(), ne, top(), left()]];
      }
      return [
        [sw, bottom(), left()],
        [ne, top(), right()],
      ];
    case 6:
      return [[se, ne, top(), bottom()]];
    case 7:
      return [[sw, se, ne, top(), left()]];
    case 8:
      return [[nw, left(), top()]];
    case 9:
      return [[sw, bottom(), top(), nw]];
    case 10:
      if (saddleInside) {
        return [[se, right(), top(), nw, left(), bottom()]];
      }
      return [
        [se, right(), bottom()],
        [nw, left(), top()],
      ];
    case 11:
      return [[sw, se, right(), top(), nw]];
    case 12:
      return [[ne, nw, left(), right()]];
    case 13:
      return [[sw, bottom(), right(), ne, nw]];
    case 14:
      return [[se, ne, nw, left(), bottom()]];
    case 15:
      return [[sw, se, ne, nw]];
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
