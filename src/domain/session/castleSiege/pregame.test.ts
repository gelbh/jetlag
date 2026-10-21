import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import {
  assignHalvesByCoin,
  buildNeutralBelt,
  type CastleSiegeBorderLine,
  halfSideOfPoint,
  pointInNeutralBelt,
  validateBorderCutsArena,
  validateSealPlacement,
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

/** Northbound vertical cut through the arena midline. */
const BORDER: CastleSiegeBorderLine = {
  type: "LineString",
  coordinates: [
    [-0.15, 51.4],
    [-0.15, 51.5],
  ],
};

const BELT_WIDTH_METERS = 100;

describe("assignHalvesByCoin", () => {
  it("assigns teamA the left half on heads and flips on tails", () => {
    expect(assignHalvesByCoin("heads")).toEqual({ teamA: "left", teamB: "right" });
    expect(assignHalvesByCoin("tails")).toEqual({ teamA: "right", teamB: "left" });
  });
});

describe("buildNeutralBelt", () => {
  it("buffers the border into a polygon covering the midline and not far flanks", () => {
    const belt = buildNeutralBelt(BORDER, BELT_WIDTH_METERS);

    expect(belt.type === "Polygon" || belt.type === "MultiPolygon").toBe(true);
    expect(booleanPointInPolygon(turfPoint([-0.15, 51.45]), belt)).toBe(true);
    expect(booleanPointInPolygon(turfPoint([-0.18, 51.45]), belt)).toBe(false);
    expect(booleanPointInPolygon(turfPoint([-0.12, 51.45]), belt)).toBe(false);
  });

  it("rejects non-positive belt width", () => {
    expect(() => buildNeutralBelt(BORDER, 0)).toThrow();
    expect(() => buildNeutralBelt(BORDER, -10)).toThrow();
  });
});

describe("halfSideOfPoint", () => {
  it("classifies west of a northbound border as left and east as right", () => {
    expect(halfSideOfPoint({ lat: 51.45, lng: -0.18 }, BORDER)).toBe("left");
    expect(halfSideOfPoint({ lat: 51.45, lng: -0.12 }, BORDER)).toBe("right");
  });
});

describe("validateBorderCutsArena", () => {
  it("accepts a border whose endpoints sit on opposite arena edges", () => {
    expect(validateBorderCutsArena(ARENA, BORDER)).toBe(true);
  });

  it("rejects a border that does not span the arena", () => {
    const stub: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [
        [-0.15, 51.42],
        [-0.15, 51.43],
      ],
    };
    expect(validateBorderCutsArena(ARENA, stub)).toBe(false);
  });

  it("rejects a border with fewer than two positions", () => {
    const stub: CastleSiegeBorderLine = {
      type: "LineString",
      coordinates: [[-0.15, 51.45]],
    };
    expect(validateBorderCutsArena(ARENA, stub)).toBe(false);
  });
});

describe("validateSealPlacement (V6)", () => {
  const assignment = assignHalvesByCoin("heads");

  it("accepts a castle in the team's own half outside the Neutral Belt", () => {
    const result = validateSealPlacement({
      point: { lat: 51.45, lng: -0.18 },
      team: "teamA",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects a castle inside the Neutral Belt", () => {
    const result = validateSealPlacement({
      point: { lat: 51.45, lng: -0.15 },
      team: "teamA",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment,
    });
    expect(result).toEqual({ ok: false, reason: "inside_neutral_belt" });
    expect(
      pointInNeutralBelt({ lat: 51.45, lng: -0.15 }, buildNeutralBelt(BORDER, BELT_WIDTH_METERS)),
    ).toBe(true);
  });

  it("rejects a castle outside the team's own half", () => {
    const result = validateSealPlacement({
      point: { lat: 51.45, lng: -0.12 },
      team: "teamA",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment,
    });
    expect(result).toEqual({ ok: false, reason: "outside_own_half" });
  });

  it("rejects a castle outside the arena", () => {
    const result = validateSealPlacement({
      point: { lat: 51.45, lng: -0.25 },
      team: "teamA",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment,
    });
    expect(result).toEqual({ ok: false, reason: "outside_arena" });
  });

  it("honors flipped coin assignment for the same seal point", () => {
    const flipped = assignHalvesByCoin("tails");
    const forTeamA = validateSealPlacement({
      point: { lat: 51.45, lng: -0.18 },
      team: "teamA",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment: flipped,
    });
    const forTeamB = validateSealPlacement({
      point: { lat: 51.45, lng: -0.18 },
      team: "teamB",
      arena: ARENA,
      border: BORDER,
      beltWidthMeters: BELT_WIDTH_METERS,
      assignment: flipped,
    });
    expect(forTeamA).toEqual({ ok: false, reason: "outside_own_half" });
    expect(forTeamB).toEqual({ ok: true });
  });
});
