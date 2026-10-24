import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import buffer from "@turf/buffer";
import { lineString, point as turfPoint } from "@turf/helpers";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import type { LineString, MultiPolygon, Polygon, Position } from "geojson";
import { gameAreaToPolygon } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";

export type CastleSiegeBorderLine = LineString;

export type CastleSiegeHalfSide = "left" | "right";

export type CastleSiegeCoinFace = "heads" | "tails";

export type CastleSiegePlayingTeam = "teamA" | "teamB";

export type CastleSiegeSealPoint = { lat: number; lng: number };

export type CastleSiegeCoinAssignment = {
  teamA: CastleSiegeHalfSide;
  teamB: CastleSiegeHalfSide;
};

export type CastleSiegeSealPlacementResult =
  | { ok: true }
  | {
      ok: false;
      reason: "outside_arena" | "inside_neutral_belt" | "outside_own_half";
    };

/** Meters: endpoints must sit this close to the arena ring to count as a cut. */
const BORDER_ENDPOINT_BOUNDARY_TOLERANCE_METERS = 25;

export class InvalidCastleSiegePregameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCastleSiegePregameError";
  }
}

export function assignHalvesByCoin(face: CastleSiegeCoinFace): CastleSiegeCoinAssignment {
  if (face === "heads") {
    return { teamA: "left", teamB: "right" };
  }
  return { teamA: "right", teamB: "left" };
}

export function buildNeutralBelt(
  border: CastleSiegeBorderLine,
  beltWidthMeters: number,
): Polygon | MultiPolygon {
  if (!(beltWidthMeters > 0) || !Number.isFinite(beltWidthMeters)) {
    throw new InvalidCastleSiegePregameError(
      "Neutral Belt width must be a positive finite number.",
    );
  }
  if (border.coordinates.length < 2) {
    throw new InvalidCastleSiegePregameError("Border requires at least two positions.");
  }

  const buffered = buffer(lineString(border.coordinates), beltWidthMeters / 2, {
    units: "meters",
  });
  if (!buffered?.geometry) {
    throw new InvalidCastleSiegePregameError("Failed to buffer Neutral Belt from border.");
  }
  return buffered.geometry;
}

export function pointInNeutralBelt(
  point: CastleSiegeSealPoint,
  belt: Polygon | MultiPolygon,
): boolean {
  return booleanPointInPolygon(turfPoint([point.lng, point.lat]), belt);
}

export function halfSideOfPoint(
  point: CastleSiegeSealPoint,
  border: CastleSiegeBorderLine,
): CastleSiegeHalfSide {
  if (border.coordinates.length < 2) {
    throw new InvalidCastleSiegePregameError("Border requires at least two positions.");
  }

  const pt = turfPoint([point.lng, point.lat]);
  const nearest = nearestPointOnLine(lineString(border.coordinates), pt);
  const index = nearest.properties.index ?? 0;
  const start = border.coordinates[index]!;
  const end = border.coordinates[Math.min(index + 1, border.coordinates.length - 1)]!;

  const vx = end[0]! - start[0]!;
  const vy = end[1]! - start[1]!;
  const wx = point.lng - start[0]!;
  const wy = point.lat - start[1]!;
  const cross = vx * wy - vy * wx;

  return cross >= 0 ? "left" : "right";
}

export function validateBorderCutsArena(arena: GameArea, border: CastleSiegeBorderLine): boolean {
  if (border.coordinates.length < 2) {
    return false;
  }

  const start = border.coordinates[0]!;
  const end = border.coordinates[border.coordinates.length - 1]!;
  if (!isNearArenaBoundary(start, arena) || !isNearArenaBoundary(end, arena)) {
    return false;
  }

  const mid: Position = [(start[0]! + end[0]!) / 2, (start[1]! + end[1]!) / 2];
  return booleanPointInPolygon(turfPoint(mid), gameAreaToPolygon(arena));
}

export type ValidateSealPlacementArgs = {
  point: CastleSiegeSealPoint;
  team: CastleSiegePlayingTeam;
  arena: GameArea;
  border: CastleSiegeBorderLine;
  beltWidthMeters: number;
  assignment: CastleSiegeCoinAssignment;
};

export function validateSealPlacement(
  args: ValidateSealPlacementArgs,
): CastleSiegeSealPlacementResult {
  const { point, team, arena, border, beltWidthMeters, assignment } = args;
  const probe = turfPoint([point.lng, point.lat]);

  if (!booleanPointInPolygon(probe, gameAreaToPolygon(arena))) {
    return { ok: false, reason: "outside_arena" };
  }

  const belt = buildNeutralBelt(border, beltWidthMeters);
  if (pointInNeutralBelt(point, belt)) {
    return { ok: false, reason: "inside_neutral_belt" };
  }

  const side = halfSideOfPoint(point, border);
  if (side !== assignment[team]) {
    return { ok: false, reason: "outside_own_half" };
  }

  return { ok: true };
}

function isNearArenaBoundary(coord: Position, arena: GameArea): boolean {
  const rings = exteriorRings(arena);
  if (rings.length === 0) {
    return false;
  }

  const probe = turfPoint(coord);
  let best = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    if (ring.length < 2) {
      continue;
    }
    const nearest = nearestPointOnLine(lineString(ring), probe, { units: "meters" });
    const distMeters = nearest.properties.dist ?? Number.POSITIVE_INFINITY;
    if (distMeters < best) {
      best = distMeters;
    }
  }
  return best <= BORDER_ENDPOINT_BOUNDARY_TOLERANCE_METERS;
}

function exteriorRings(arena: GameArea): Position[][] {
  if (arena.type === "Polygon") {
    const ring = arena.coordinates[0];
    return ring && ring.length >= 2 ? [ring] : [];
  }
  const out: Position[][] = [];
  for (const polygon of arena.coordinates) {
    const ring = polygon[0];
    if (ring && ring.length >= 2) {
      out.push(ring);
    }
  }
  return out;
}
