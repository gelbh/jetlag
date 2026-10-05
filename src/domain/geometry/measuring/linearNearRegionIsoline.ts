import intersect from "@turf/intersect";
import type { Feature, LineString, MultiPolygon, Polygon, Position } from "geojson";
import type { GameArea } from "../../map/annotations";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  type LatLngTuple,
} from "../gameArea/geometryCore";
import { runUnionPolygonFeatures } from "../kernel/unionKernelRunner";
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
  const { stamped, remainder } = stampFineCoarseCells(boundary, divisions);

  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latStep = (north - south) / divisions;
  const lngStep = (east - west) / divisions;
  const fineLatStep = latStep / LINEAR_NEAR_REGION_FINE_PER_COARSE;
  const fineLngStep = lngStep / LINEAR_NEAR_REGION_FINE_PER_COARSE;

  const isolineParts: Feature<Polygon | MultiPolygon>[] = [];
  const stampedFineCells: Array<{ fineRow: number; fineCol: number }> = [];
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (!stamped[row]![col]) {
        continue;
      }
      const baseRow = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const baseCol = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      for (let fr = 0; fr < LINEAR_NEAR_REGION_FINE_PER_COARSE; fr += 1) {
        for (let fc = 0; fc < LINEAR_NEAR_REGION_FINE_PER_COARSE; fc += 1) {
          stampedFineCells.push({ fineRow: baseRow + fr, fineCol: baseCol + fc });
        }
      }
    }
  }

  const cornerKeys = new Set<string>();
  const cornersToSample: Array<[number, number]> = [];
  const addCorner = (fineRow: number, fineCol: number) => {
    const key = `${fineRow},${fineCol}`;
    if (cornerKeys.has(key)) {
      return;
    }
    cornerKeys.add(key);
    cornersToSample.push([fineRow, fineCol]);
  };
  for (const cell of stampedFineCells) {
    addCorner(cell.fineRow, cell.fineCol);
    addCorner(cell.fineRow, cell.fineCol + 1);
    addCorner(cell.fineRow + 1, cell.fineCol);
    addCorner(cell.fineRow + 1, cell.fineCol + 1);
  }

  const cornerDistances = new Map<string, number>();
  for (const [fineRow, fineCol] of cornersToSample) {
    const point: LatLngTuple = [south + fineRow * fineLatStep, west + fineCol * fineLngStep];
    const nearest = nearestPointToCoastlines(point, prepared.segments, prepared);
    cornerDistances.set(
      `${fineRow},${fineCol}`,
      nearest?.distanceMeters ?? Number.POSITIVE_INFINITY,
    );
    queryCount += 1;
    if (queryCount % COASTLINE_NEAR_REGION_YIELD_EVERY === 0) {
      await yieldCoastlineNearRegionBuild();
    }
  }

  const cornerDistance = (fineRow: number, fineCol: number): number =>
    cornerDistances.get(`${fineRow},${fineCol}`) ?? Number.POSITIVE_INFINITY;

  for (const { fineRow, fineCol } of stampedFineCells) {
    const sw: Position = [west + fineCol * fineLngStep, south + fineRow * fineLatStep];
    const se: Position = [west + (fineCol + 1) * fineLngStep, south + fineRow * fineLatStep];
    const ne: Position = [west + (fineCol + 1) * fineLngStep, south + (fineRow + 1) * fineLatStep];
    const nw: Position = [west + fineCol * fineLngStep, south + (fineRow + 1) * fineLatStep];
    const rings = marchingSquareFillRings(
      sw,
      se,
      ne,
      nw,
      cornerDistance(fineRow, fineCol),
      cornerDistance(fineRow, fineCol + 1),
      cornerDistance(fineRow + 1, fineCol + 1),
      cornerDistance(fineRow + 1, fineCol),
      radiusMeters,
    );
    for (const ring of rings) {
      isolineParts.push(polygonFromRing(ring));
    }
  }

  const remainderCorners: Array<[number, number]> = [];
  const remainderCornerKeys = new Set<string>();
  const addRemainderCorner = (fineRow: number, fineCol: number) => {
    const key = `${fineRow},${fineCol}`;
    if (remainderCornerKeys.has(key) || cornerKeys.has(key)) {
      return;
    }
    remainderCornerKeys.add(key);
    remainderCorners.push([fineRow, fineCol]);
  };
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (!remainder[row]![col]) {
        continue;
      }
      const southFine = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const westFine = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const northFine = southFine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const eastFine = westFine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
      addRemainderCorner(southFine, westFine);
      addRemainderCorner(southFine, eastFine);
      addRemainderCorner(northFine, westFine);
      addRemainderCorner(northFine, eastFine);
    }
  }
  for (const [fineRow, fineCol] of remainderCorners) {
    const point: LatLngTuple = [south + fineRow * fineLatStep, west + fineCol * fineLngStep];
    const nearest = nearestPointToCoastlines(point, prepared.segments, prepared);
    cornerDistances.set(
      `${fineRow},${fineCol}`,
      nearest?.distanceMeters ?? Number.POSITIVE_INFINITY,
    );
    queryCount += 1;
    if (queryCount % COASTLINE_NEAR_REGION_YIELD_EVERY === 0) {
      await yieldCoastlineNearRegionBuild();
    }
  }
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (!remainder[row]![col]) {
        continue;
      }
      const southFine = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const westFine = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const northFine = southFine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const eastFine = westFine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
      const sw: Position = [west + col * lngStep, south + row * latStep];
      const se: Position = [west + (col + 1) * lngStep, south + row * latStep];
      const ne: Position = [west + (col + 1) * lngStep, south + (row + 1) * latStep];
      const nw: Position = [west + col * lngStep, south + (row + 1) * latStep];
      const rings = marchingSquareFillRings(
        sw,
        se,
        ne,
        nw,
        cornerDistance(southFine, westFine),
        cornerDistance(southFine, eastFine),
        cornerDistance(northFine, eastFine),
        cornerDistance(northFine, westFine),
        radiusMeters,
      );
      for (const ring of rings) {
        isolineParts.push(polygonFromRing(ring));
      }
    }
  }

  const interiorGrid: CellClass[][] = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => "skip" as CellClass),
  );
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      if (grid[row][col] === "near" && !boundary[row]![col]) {
        interiorGrid[row][col] = "near";
      }
    }
  }

  const interior = buildMeasuringNearRegionFromCellGrid(interiorGrid, gameArea, divisions);
  const parts = interior ? [...isolineParts, interior] : isolineParts;
  if (parts.length === 0) {
    return null;
  }

  const united = await runUnionPolygonFeatures(parts);
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

function stampFineCoarseCells(
  boundary: boolean[][],
  divisions: number,
): { stamped: boolean[][]; remainder: boolean[][] } {
  const stamped = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => false),
  );
  const remainder = Array.from({ length: divisions }, () =>
    Array.from({ length: divisions }, () => false),
  );
  const haloOffsets: Array<[number, number]> = [
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
  let overCap = false;
  const finePerCell = LINEAR_NEAR_REGION_FINE_PER_COARSE * LINEAR_NEAR_REGION_FINE_PER_COARSE;
  for (const candidate of candidates) {
    if (!overCap && fineSamples + finePerCell > LINEAR_NEAR_REGION_MAX_FINE_SAMPLES) {
      overCap = true;
    }
    if (overCap) {
      remainder[candidate.row][candidate.col] = true;
      continue;
    }
    stamped[candidate.row][candidate.col] = true;
    fineSamples += finePerCell;
  }

  return { stamped, remainder };
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
