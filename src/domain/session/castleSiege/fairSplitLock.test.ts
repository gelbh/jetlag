import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { castleSiegeSetupPatchToFirestore } from "@/services/firestore/serialization/serializeCastleSiege";
import { proposeFairSplit } from "./fairSplit";
import {
  buildFairSplitLockPatch,
  nudgeFairSplitBorder,
  resolveFairSplitSetupPath,
} from "./fairSplitLock";
import type { CastleSiegeBorderLine } from "./pregame";

const ARENA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

const MIDLINE: CastleSiegeBorderLine = {
  type: "LineString",
  coordinates: [
    [-0.15, 51.4],
    [-0.15, 51.5],
  ],
};

const SEAL_WEST = { lat: 51.45, lng: -0.18 };
const SEAL_EAST = { lat: 51.45, lng: -0.12 };
const BELT_OK = 100;

describe("resolveFairSplitSetupPath fail-closed", () => {
  it("flags manual path when no legal cut exists", () => {
    const path = resolveFairSplitSetupPath({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [],
    });
    expect(path).toEqual({
      kind: "manualPath",
      reason: "noLegalCut",
      requiresManualPath: true,
    });
  });

  it("returns a proposal when a legal cut exists", () => {
    const path = resolveFairSplitSetupPath({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [MIDLINE],
    });
    expect(path.kind).toBe("proposal");
    if (path.kind !== "proposal") return;
    expect(path.result.ok).toBe(true);
    expect(path.result.border).toEqual(MIDLINE);
  });
});

describe("buildFairSplitLockPatch host gate + serialize", () => {
  it("rejects non-host lock attempts", () => {
    expect(
      buildFairSplitLockPatch({
        isHost: false,
        arena: ARENA,
        border: MIDLINE,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toEqual({ ok: false, reason: "notHost" });
  });

  it("rejects illegal host overrides", () => {
    const stub: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.15, 51.42],
        [-0.15, 51.43],
      ],
    };
    expect(
      buildFairSplitLockPatch({
        isHost: true,
        arena: ARENA,
        border: stub,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toEqual({ ok: false, reason: "illegalCut" });
  });

  it("builds a serializable lock patch for a legal host cut", () => {
    const lock = buildFairSplitLockPatch({
      isHost: true,
      arena: ARENA,
      border: MIDLINE,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
    });
    expect(lock.ok).toBe(true);
    if (!lock.ok) return;

    expect(lock.patch.border).toEqual(MIDLINE);
    expect(lock.patch.coinAssignment).toEqual({ teamA: "left", teamB: "right" });
    expect(lock.patch.neutralBelt).toBeDefined();

    const payload = castleSiegeSetupPatchToFirestore(lock.patch);
    expect(payload.border).toEqual({ geometryJson: JSON.stringify(MIDLINE) });
    expect(payload.neutralBelt).toEqual({
      geometryJson: JSON.stringify(lock.patch.neutralBelt),
    });
    expect(payload.coinAssignment).toEqual({ teamA: "left", teamB: "right" });
  });

  it("re-validates a nudged border before lock", () => {
    const proposed = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [MIDLINE],
    });
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    // Pull endpoints north of the arena ring so the cut no longer spans it.
    const nudged = nudgeFairSplitBorder(proposed.border, { translateLat: 0.05 });
    const lock = buildFairSplitLockPatch({
      isHost: true,
      arena: ARENA,
      border: nudged,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
    });
    expect(lock.ok).toBe(false);
    if (lock.ok) return;
    expect(lock.reason).toBe("illegalCut");
  });
});

describe("nudgeFairSplitBorder", () => {
  it("translates all vertices by the requested delta", () => {
    const nudged = nudgeFairSplitBorder(MIDLINE, { translateLng: 0.01, translateLat: -0.02 });
    expect(nudged.coordinates[0]![0]).toBeCloseTo(-0.14, 10);
    expect(nudged.coordinates[0]![1]).toBeCloseTo(51.38, 10);
    expect(nudged.coordinates[1]![0]).toBeCloseTo(-0.14, 10);
    expect(nudged.coordinates[1]![1]).toBeCloseTo(51.48, 10);
  });

  it("rotates the cut around its midpoint", () => {
    const nudged = nudgeFairSplitBorder(MIDLINE, { rotateDegrees: 90 });
    expect(nudged.coordinates).toHaveLength(2);
    const [start, end] = nudged.coordinates;
    expect((start![0]! + end![0]!) / 2).toBeCloseTo(-0.15, 5);
    expect((start![1]! + end![1]!) / 2).toBeCloseTo(51.45, 5);
    expect(Math.abs(start![1]! - end![1]!)).toBeLessThan(0.001);
    expect(Math.abs(start![0]! - end![0]!)).toBeGreaterThan(0.05);
  });
});
