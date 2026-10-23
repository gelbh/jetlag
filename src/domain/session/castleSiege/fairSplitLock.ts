import type { MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import {
  assignHalvesByCastleSide,
  type FairSplitHalves,
  isLegalFairSplitCut,
  type ProposeFairSplitArgs,
  type ProposeFairSplitOk,
  proposeFairSplit,
} from "./fairSplit";
import { buildNeutralBelt, type CastleSiegeBorderLine, type CastleSiegeSealPoint } from "./pregame";

export type FairSplitManualPath = {
  kind: "manualPath";
  reason: "noLegalCut";
  /** UI must force the Pregame-style manual border path. */
  requiresManualPath: true;
};

export type FairSplitProposalPath =
  | { kind: "proposal"; result: ProposeFairSplitOk }
  | FairSplitManualPath;

export type FairSplitLockArgs = {
  isHost: boolean;
  arena: GameArea;
  border: CastleSiegeBorderLine;
  sealA: CastleSiegeSealPoint;
  sealB: CastleSiegeSealPoint;
  beltWidthMeters: number;
};

/** Setup fields written via `updateCastleSiegeSetup` on Fair-split lock. */
export type FairSplitLockPatch = {
  border: CastleSiegeBorderLine;
  neutralBelt: Polygon | MultiPolygon;
  coinAssignment: FairSplitHalves;
};

export type FairSplitLockResult =
  | { ok: true; patch: FairSplitLockPatch }
  | { ok: false; reason: "notHost" | "illegalCut" };

export type FairSplitNudge = {
  translateLng?: number;
  translateLat?: number;
  /** Counter-clockwise degrees around the border midpoint. */
  rotateDegrees?: number;
};

/**
 * Run Fair-split search; fail closed to a manual-path flag when no legal cut.
 */
export function resolveFairSplitSetupPath(args: ProposeFairSplitArgs): FairSplitProposalPath {
  const result = proposeFairSplit(args);
  if (!result.ok) {
    return { kind: "manualPath", reason: "noLegalCut", requiresManualPath: true };
  }
  return { kind: "proposal", result };
}

/**
 * Host-only lock: re-validate with V7, then build the setup patch
 * (`border` + `neutralBelt` + halves as `coinAssignment`).
 */
export function buildFairSplitLockPatch(args: FairSplitLockArgs): FairSplitLockResult {
  if (!args.isHost) {
    return { ok: false, reason: "notHost" };
  }

  const { arena, border, sealA, sealB, beltWidthMeters } = args;
  if (!isLegalFairSplitCut({ arena, border, sealA, sealB, beltWidthMeters })) {
    return { ok: false, reason: "illegalCut" };
  }

  const halves = assignHalvesByCastleSide(sealA, sealB, border);
  if (!halves) {
    return { ok: false, reason: "illegalCut" };
  }

  let neutralBelt: Polygon | MultiPolygon;
  try {
    neutralBelt = buildNeutralBelt(border, beltWidthMeters);
  } catch {
    return { ok: false, reason: "illegalCut" };
  }

  return {
    ok: true,
    patch: {
      border,
      neutralBelt,
      coinAssignment: halves,
    },
  };
}

/** Small translate / rotate for host nudge before re-validation + lock. */
export function nudgeFairSplitBorder(
  border: CastleSiegeBorderLine,
  nudge: FairSplitNudge,
): CastleSiegeBorderLine {
  const translateLng = nudge.translateLng ?? 0;
  const translateLat = nudge.translateLat ?? 0;
  const rotateDegrees = nudge.rotateDegrees ?? 0;

  let coordinates = border.coordinates.map((c): [number, number] => [
    c[0]! + translateLng,
    c[1]! + translateLat,
  ]);

  if (rotateDegrees !== 0 && coordinates.length >= 2) {
    const rad = (rotateDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of coordinates) {
      sumLng += lng;
      sumLat += lat;
    }
    const mx = sumLng / coordinates.length;
    const my = sumLat / coordinates.length;
    coordinates = coordinates.map(([lng, lat]) => {
      const dx = lng - mx;
      const dy = lat - my;
      return [mx + dx * cos - dy * sin, my + dx * sin + dy * cos];
    });
  }

  return { type: "LineString", coordinates };
}
