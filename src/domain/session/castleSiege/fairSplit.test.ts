import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import {
  assignHalvesByCastleSide,
  generateFairSplitCandidates,
  isLegalFairSplitCut,
  proposeFairSplit,
  scoreFairSplitCandidate,
} from "./fairSplit";
import {
  buildNeutralBelt,
  type CastleSiegeBorderLine,
  halfSideOfPoint,
  pointInNeutralBelt,
} from "./pregame";

/** Square arena spanning ~0.02° (~2 km) near London. */
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

/** Northbound vertical midline cut. */
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

describe("isLegalFairSplitCut (V7)", () => {
  it("accepts opposite seals outside the Neutral Belt", () => {
    expect(
      isLegalFairSplitCut({
        arena: ARENA,
        border: MIDLINE,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toBe(true);
  });

  it("rejects same-side seals", () => {
    expect(
      isLegalFairSplitCut({
        arena: ARENA,
        border: MIDLINE,
        sealA: SEAL_WEST,
        sealB: { lat: 51.48, lng: -0.19 },
        beltWidthMeters: BELT_OK,
      }),
    ).toBe(false);
    expect(assignHalvesByCastleSide(SEAL_WEST, { lat: 51.48, lng: -0.19 }, MIDLINE)).toBeNull();
  });

  it("rejects when a seal sits inside the Neutral Belt", () => {
    expect(
      isLegalFairSplitCut({
        arena: ARENA,
        border: MIDLINE,
        sealA: { lat: 51.45, lng: -0.15 },
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toBe(false);
  });

  it("rejects a border that does not cut the arena", () => {
    const stub: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.15, 51.42],
        [-0.15, 51.43],
      ],
    };
    expect(
      isLegalFairSplitCut({
        arena: ARENA,
        border: stub,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toBe(false);
  });
});

describe("proposeFairSplit fail-closed", () => {
  it("returns noLegalCut when the candidate list is empty", () => {
    expect(
      proposeFairSplit({
        arena: ARENA,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
        candidates: [],
      }),
    ).toEqual({ ok: false, reason: "noLegalCut" });
  });

  it("returns noLegalCut when every candidate is illegal", () => {
    const sameSideOnly: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.2, 51.45],
        [-0.1, 51.45],
      ],
    };
    // Both seals are south of this eastbound cut → same side.
    const result = proposeFairSplit({
      arena: ARENA,
      sealA: { lat: 51.42, lng: -0.18 },
      sealB: { lat: 51.42, lng: -0.12 },
      beltWidthMeters: BELT_OK,
      candidates: [sameSideOnly],
    });
    expect(result).toEqual({ ok: false, reason: "noLegalCut" });
  });
});

describe("proposeFairSplit candidate search + scoring", () => {
  it("proposes a legal cut for opposite seals in a square arena", () => {
    const result = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.halves.teamA).not.toBe(result.halves.teamB);
    expect(halfSideOfPoint(SEAL_WEST, result.border)).toBe(result.halves.teamA);
    expect(halfSideOfPoint(SEAL_EAST, result.border)).toBe(result.halves.teamB);
    expect(pointInNeutralBelt(SEAL_WEST, result.neutralBelt)).toBe(false);
    expect(pointInNeutralBelt(SEAL_EAST, result.neutralBelt)).toBe(false);
  });

  it("is deterministic for the same arena and seals", () => {
    const args = {
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
    } as const;
    const a = proposeFairSplit(args);
    const b = proposeFairSplit(args);
    expect(a).toEqual(b);
  });

  it("prefers a balanced legal candidate over an illegal near-perfect balance cut", () => {
    const legalBalanced = MIDLINE;
    // Same-side horizontal cut would score well on area if it were legal, but is not.
    const illegalHorizontal: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.2, 51.45],
        [-0.1, 51.45],
      ],
    };

    const result = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [illegalHorizontal, legalBalanced],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.border).toEqual(legalBalanced);

    // Sanity: illegal cut scores as if balanced on landmarks but must stay rejected.
    expect(
      isLegalFairSplitCut({
        arena: ARENA,
        border: illegalHorizontal,
        sealA: SEAL_WEST,
        sealB: SEAL_EAST,
        beltWidthMeters: BELT_OK,
      }),
    ).toBe(false);
  });

  it("ranks landmark-balanced legal cuts ahead of skewed ones", () => {
    const balanced = MIDLINE;
    const skewed: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.12, 51.4],
        [-0.12, 51.5],
      ],
    };
    const landmarks = [
      { lat: 51.42, lng: -0.18 },
      { lat: 51.48, lng: -0.18 },
      { lat: 51.42, lng: -0.12 },
      { lat: 51.48, lng: -0.12 },
    ];

    const scoreBalanced = scoreFairSplitCandidate({
      arena: ARENA,
      border: balanced,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      landmarks,
    });
    const scoreSkewed = scoreFairSplitCandidate({
      arena: ARENA,
      border: skewed,
      sealA: SEAL_WEST,
      sealB: { lat: 51.45, lng: -0.105 },
      beltWidthMeters: BELT_OK,
      landmarks,
    });
    expect(scoreBalanced).toBeLessThan(scoreSkewed);

    const result = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      landmarks,
      candidates: [skewed, balanced],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.border).toEqual(balanced);
  });

  it("generates arena-cutting candidates from the angle/offset sweep", () => {
    const candidates = generateFairSplitCandidates(ARENA, 8, 5);
    expect(candidates.length).toBeGreaterThan(0);
    for (const border of candidates.slice(0, 5)) {
      expect(border.coordinates.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("proposeFairSplit Neutral Belt + half ownership", () => {
  it("auto-buffers the Neutral Belt and assigns halves by castle side", () => {
    const result = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [MIDLINE],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.halves).toEqual({
      teamA: halfSideOfPoint(SEAL_WEST, MIDLINE),
      teamB: halfSideOfPoint(SEAL_EAST, MIDLINE),
    });
    expect(result.neutralBelt).toEqual(buildNeutralBelt(MIDLINE, BELT_OK));
    expect(booleanPointInPolygon(turfPoint([-0.15, 51.45]), result.neutralBelt)).toBe(true);
  });

  it("fails closed when belt width swallows a castle that a thin belt would spare", () => {
    const nearBorderWest = { lat: 51.45, lng: -0.1508 };
    const nearBorderEast = { lat: 51.45, lng: -0.1492 };

    const thin = proposeFairSplit({
      arena: ARENA,
      sealA: nearBorderWest,
      sealB: nearBorderEast,
      beltWidthMeters: 20,
      candidates: [MIDLINE],
    });
    const fat = proposeFairSplit({
      arena: ARENA,
      sealA: nearBorderWest,
      sealB: nearBorderEast,
      beltWidthMeters: 400,
      candidates: [MIDLINE],
    });

    expect(thin.ok).toBe(true);
    expect(fat).toEqual({ ok: false, reason: "noLegalCut" });
  });

  it("does not use coin assignment: flipping seal labels flips half labels", () => {
    const ab = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_WEST,
      sealB: SEAL_EAST,
      beltWidthMeters: BELT_OK,
      candidates: [MIDLINE],
    });
    const ba = proposeFairSplit({
      arena: ARENA,
      sealA: SEAL_EAST,
      sealB: SEAL_WEST,
      beltWidthMeters: BELT_OK,
      candidates: [MIDLINE],
    });
    expect(ab.ok && ba.ok).toBe(true);
    if (!ab.ok || !ba.ok) return;
    expect(ab.halves.teamA).toBe(ba.halves.teamB);
    expect(ab.halves.teamB).toBe(ba.halves.teamA);
  });
});
