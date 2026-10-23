import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfDistance from "@turf/distance";
import { lineString, point as turfPoint } from "@turf/helpers";
import turfLength from "@turf/length";
import lineIntersect from "@turf/line-intersect";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import type { Feature, LineString, MultiPolygon, Polygon, Position } from "geojson";
import { gameAreaToBoundingBoxRaw } from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToPolygon } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import {
  buildNeutralBelt,
  type CastleSiegeBorderLine,
  type CastleSiegeCoinAssignment,
  type CastleSiegeHalfSide,
  type CastleSiegeSealPoint,
  halfSideOfPoint,
  pointInNeutralBelt,
  validateBorderCutsArena,
} from "./pregame";

const DEFAULT_ANGLE_STEPS = 18;
const DEFAULT_OFFSET_STEPS = 11;
const AREA_SAMPLE_GRID = 8;

export type FairSplitHalves = CastleSiegeCoinAssignment;

export type ProposeFairSplitArgs = {
  arena: GameArea;
  sealA: CastleSiegeSealPoint;
  sealB: CastleSiegeSealPoint;
  beltWidthMeters: number;
  landmarks?: readonly CastleSiegeSealPoint[];
  candidates?: readonly CastleSiegeBorderLine[];
  search?: {
    angleSteps?: number;
    offsetSteps?: number;
  };
};

export type ProposeFairSplitOk = {
  ok: true;
  border: CastleSiegeBorderLine;
  halves: FairSplitHalves;
  neutralBelt: Polygon | MultiPolygon;
  score: number;
};

export type ProposeFairSplitResult = ProposeFairSplitOk | { ok: false; reason: "noLegalCut" };

export type FairSplitLegalityArgs = {
  arena: GameArea;
  border: CastleSiegeBorderLine;
  sealA: CastleSiegeSealPoint;
  sealB: CastleSiegeSealPoint;
  beltWidthMeters: number;
};

/**
 * Half ownership from sealed castles: each team's half is the side containing
 * its castle. Returns null when seals share a side (illegal for Fair-split).
 */
export function assignHalvesByCastleSide(
  sealA: CastleSiegeSealPoint,
  sealB: CastleSiegeSealPoint,
  border: CastleSiegeBorderLine,
): FairSplitHalves | null {
  const teamA = halfSideOfPoint(sealA, border);
  const teamB = halfSideOfPoint(sealB, border);
  if (teamA === teamB) {
    return null;
  }
  return { teamA, teamB };
}

export function isLegalFairSplitCut(args: FairSplitLegalityArgs): boolean {
  const { arena, border, sealA, sealB, beltWidthMeters } = args;
  if (!(beltWidthMeters > 0) || !Number.isFinite(beltWidthMeters)) {
    return false;
  }
  if (!validateBorderCutsArena(arena, border)) {
    return false;
  }
  if (assignHalvesByCastleSide(sealA, sealB, border) === null) {
    return false;
  }

  let belt: Polygon | MultiPolygon;
  try {
    belt = buildNeutralBelt(border, beltWidthMeters);
  } catch {
    return false;
  }

  if (pointInNeutralBelt(sealA, belt) || pointInNeutralBelt(sealB, belt)) {
    return false;
  }

  const arenaPoly = gameAreaToPolygon(arena);
  if (
    !booleanPointInPolygon(turfPoint([sealA.lng, sealA.lat]), arenaPoly) ||
    !booleanPointInPolygon(turfPoint([sealB.lng, sealB.lat]), arenaPoly)
  ) {
    return false;
  }

  return true;
}

export type ScoreFairSplitArgs = FairSplitLegalityArgs & {
  landmarks?: readonly CastleSiegeSealPoint[];
};

export function scoreFairSplitCandidate(args: ScoreFairSplitArgs): number {
  const { arena, border, sealA, sealB, landmarks } = args;
  const balance = sideBalanceImbalance(arena, border, landmarks);
  const lengthMeters = turfLength(lineString(border.coordinates), { units: "meters" });
  const travelGap = travelProxyImbalanceMeters(arena, border, sealA, sealB);

  // Normalize length against arena bbox diagonal so scores stay order-1.
  const bounds = gameAreaToBoundingBoxRaw(arena);
  const diagMeters = approxDiagMeters(bounds);
  const lengthNorm = diagMeters > 0 ? lengthMeters / diagMeters : lengthMeters;
  const travelNorm = diagMeters > 0 ? travelGap / diagMeters : travelGap;

  return balance + 0.15 * lengthNorm + travelNorm;
}

export function proposeFairSplit(args: ProposeFairSplitArgs): ProposeFairSplitResult {
  const { arena, sealA, sealB, beltWidthMeters, landmarks, candidates, search } = args;

  const borders =
    candidates !== undefined
      ? [...candidates]
      : generateFairSplitCandidates(arena, search?.angleSteps, search?.offsetSteps);

  let best: ProposeFairSplitOk | null = null;

  for (const border of borders) {
    const legality: FairSplitLegalityArgs = {
      arena,
      border,
      sealA,
      sealB,
      beltWidthMeters,
    };
    if (!isLegalFairSplitCut(legality)) {
      continue;
    }

    const halves = assignHalvesByCastleSide(sealA, sealB, border);
    if (!halves) {
      continue;
    }

    const score = scoreFairSplitCandidate({ ...legality, landmarks });
    if (best === null || score < best.score) {
      best = {
        ok: true,
        border,
        halves,
        neutralBelt: buildNeutralBelt(border, beltWidthMeters),
        score,
      };
    }
  }

  return best ?? { ok: false, reason: "noLegalCut" };
}

export function generateFairSplitCandidates(
  arena: GameArea,
  angleSteps: number = DEFAULT_ANGLE_STEPS,
  offsetSteps: number = DEFAULT_OFFSET_STEPS,
): CastleSiegeBorderLine[] {
  const stepsA = Math.max(1, Math.floor(angleSteps));
  const stepsO = Math.max(1, Math.floor(offsetSteps));
  const bounds = gameAreaToBoundingBoxRaw(arena);
  const cx = (bounds.west + bounds.east) / 2;
  const cy = (bounds.south + bounds.north) / 2;
  const halfDiag = approxDiagMeters(bounds) / 2;
  if (!(halfDiag > 0)) {
    return [];
  }

  const ringLines = arenaExteriorLines(arena);
  if (ringLines.length === 0) {
    return [];
  }

  const out: CastleSiegeBorderLine[] = [];
  const seen = new Set<string>();

  for (let ai = 0; ai < stepsA; ai += 1) {
    const angle = (Math.PI * ai) / stepsA;
    const dirLng = Math.cos(angle);
    const dirLat = Math.sin(angle);
    const perpLng = -Math.sin(angle);
    const perpLat = Math.cos(angle);

    for (let oi = 0; oi < stepsO; oi += 1) {
      const t = stepsO === 1 ? 0 : (oi / (stepsO - 1)) * 2 - 1;
      const offsetFrac = t * 0.45;
      const offsetMeters = offsetFrac * halfDiag;
      const midLatRad = (cy * Math.PI) / 180;
      const metersPerDegLng = 111_320 * Math.cos(midLatRad);
      const metersPerDegLat = 111_320;
      const ox = (offsetMeters * perpLng) / metersPerDegLng;
      const oy = (offsetMeters * perpLat) / metersPerDegLat;
      const mx = cx + ox;
      const my = cy + oy;

      // Long probe beyond the arena so intersections hit the ring.
      const extentDeg = (halfDiag * 3) / metersPerDegLat;
      const probe: CastleSiegeBorderLine = {
        type: "LineString",
        coordinates: [
          [mx - dirLng * extentDeg, my - dirLat * extentDeg],
          [mx + dirLng * extentDeg, my + dirLat * extentDeg],
        ],
      };

      const clipped = clipBorderToArenaRings(probe, ringLines);
      if (!clipped) {
        continue;
      }
      if (!validateBorderCutsArena(arena, clipped)) {
        continue;
      }

      const key = borderKey(clipped);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(clipped);
    }
  }

  return out;
}

function arenaExteriorLines(arena: GameArea): Feature<LineString>[] {
  const rings: Position[][] =
    arena.type === "Polygon"
      ? arena.coordinates[0]
        ? [arena.coordinates[0]]
        : []
      : arena.coordinates
          .map((polygon) => polygon[0])
          .filter((ring): ring is Position[] => Boolean(ring && ring.length >= 2));

  return rings.filter((ring) => ring.length >= 2).map((ring) => lineString(ring));
}

function clipBorderToArenaRings(
  probe: CastleSiegeBorderLine,
  ringLines: readonly Feature<LineString>[],
): CastleSiegeBorderLine | null {
  const probeLine = lineString(probe.coordinates);
  const points: Position[] = [];
  for (const ringLine of ringLines) {
    const hits = lineIntersect(probeLine, ringLine);
    for (const f of hits.features) {
      const c = f.geometry.coordinates as Position;
      if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        points.push(c);
      }
    }
  }
  if (points.length < 2) {
    return null;
  }

  const [aLng, aLat] = probe.coordinates[0]!;
  const [bLng, bLat] = probe.coordinates[probe.coordinates.length - 1]!;
  const dx = bLng! - aLng!;
  const dy = bLat! - aLat!;
  const ranked = [...points].sort((p, q) => {
    const tp = (p[0]! - aLng!) * dx + (p[1]! - aLat!) * dy;
    const tq = (q[0]! - aLng!) * dx + (q[1]! - aLat!) * dy;
    return tp - tq;
  });
  const start = ranked[0]!;
  const end = ranked[ranked.length - 1]!;
  if (start[0] === end[0] && start[1] === end[1]) {
    return null;
  }

  return {
    type: "LineString",
    coordinates: [start, end],
  };
}

function borderKey(border: CastleSiegeBorderLine): string {
  const round = (n: number) => n.toFixed(6);
  const c0 = border.coordinates[0]!;
  const c1 = border.coordinates[border.coordinates.length - 1]!;
  const a = `${round(c0[0]!)},${round(c0[1]!)}`;
  const b = `${round(c1[0]!)},${round(c1[1]!)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sideBalanceImbalance(
  arena: GameArea,
  border: CastleSiegeBorderLine,
  landmarks: readonly CastleSiegeSealPoint[] | undefined,
): number {
  if (landmarks && landmarks.length > 0) {
    let left = 0;
    let right = 0;
    for (const lm of landmarks) {
      const side = halfSideOfPoint(lm, border);
      if (side === "left") left += 1;
      else right += 1;
    }
    const total = left + right;
    if (total === 0) {
      return 0;
    }
    return Math.abs(left - right) / total;
  }

  return sampledAreaImbalance(arena, border);
}

function sampledAreaImbalance(arena: GameArea, border: CastleSiegeBorderLine): number {
  const bounds = gameAreaToBoundingBoxRaw(arena);
  const poly = gameAreaToPolygon(arena);
  let left = 0;
  let right = 0;

  for (let i = 0; i < AREA_SAMPLE_GRID; i += 1) {
    for (let j = 0; j < AREA_SAMPLE_GRID; j += 1) {
      const lng = bounds.west + ((i + 0.5) / AREA_SAMPLE_GRID) * (bounds.east - bounds.west);
      const lat = bounds.south + ((j + 0.5) / AREA_SAMPLE_GRID) * (bounds.north - bounds.south);
      if (!booleanPointInPolygon(turfPoint([lng, lat]), poly)) {
        continue;
      }
      const side = halfSideOfPoint({ lat, lng }, border);
      if (side === "left") left += 1;
      else right += 1;
    }
  }

  const total = left + right;
  if (total === 0) {
    return 0;
  }
  return Math.abs(left - right) / total;
}

function travelProxyImbalanceMeters(
  arena: GameArea,
  border: CastleSiegeBorderLine,
  sealA: CastleSiegeSealPoint,
  sealB: CastleSiegeSealPoint,
): number {
  const centroids = halfCentroids(arena, border, sealA, sealB);
  const dLeft = distanceToBorderMeters(centroids.left, border);
  const dRight = distanceToBorderMeters(centroids.right, border);
  return Math.abs(dLeft - dRight);
}

function halfCentroids(
  arena: GameArea,
  border: CastleSiegeBorderLine,
  sealA: CastleSiegeSealPoint,
  sealB: CastleSiegeSealPoint,
): Record<CastleSiegeHalfSide, CastleSiegeSealPoint> {
  const bounds = gameAreaToBoundingBoxRaw(arena);
  const poly = gameAreaToPolygon(arena);
  const acc: Record<CastleSiegeHalfSide, { lng: number; lat: number; n: number }> = {
    left: { lng: 0, lat: 0, n: 0 },
    right: { lng: 0, lat: 0, n: 0 },
  };

  for (let i = 0; i < AREA_SAMPLE_GRID; i += 1) {
    for (let j = 0; j < AREA_SAMPLE_GRID; j += 1) {
      const lng = bounds.west + ((i + 0.5) / AREA_SAMPLE_GRID) * (bounds.east - bounds.west);
      const lat = bounds.south + ((j + 0.5) / AREA_SAMPLE_GRID) * (bounds.north - bounds.south);
      if (!booleanPointInPolygon(turfPoint([lng, lat]), poly)) {
        continue;
      }
      const side = halfSideOfPoint({ lat, lng }, border);
      acc[side].lng += lng;
      acc[side].lat += lat;
      acc[side].n += 1;
    }
  }

  const sideA = halfSideOfPoint(sealA, border);
  const sideB = halfSideOfPoint(sealB, border);

  return {
    left: centroidOrSeal(acc.left, sideA === "left" ? sealA : sealB),
    right: centroidOrSeal(acc.right, sideB === "right" ? sealB : sealA),
  };
}

function centroidOrSeal(
  acc: { lng: number; lat: number; n: number },
  sealFallback: CastleSiegeSealPoint,
): CastleSiegeSealPoint {
  if (acc.n === 0) {
    return sealFallback;
  }
  return { lng: acc.lng / acc.n, lat: acc.lat / acc.n };
}

function distanceToBorderMeters(
  point: CastleSiegeSealPoint,
  border: CastleSiegeBorderLine,
): number {
  const nearest = nearestPointOnLine(
    lineString(border.coordinates),
    turfPoint([point.lng, point.lat]),
    { units: "meters" },
  );
  return (
    nearest.properties.dist ??
    turfDistance(turfPoint([point.lng, point.lat]), nearest, { units: "meters" })
  );
}

function approxDiagMeters(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}): number {
  const midLat = (bounds.south + bounds.north) / 2;
  const latM = (bounds.north - bounds.south) * 111_320;
  const lngM = (bounds.east - bounds.west) * 111_320 * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(latM, lngM);
}
