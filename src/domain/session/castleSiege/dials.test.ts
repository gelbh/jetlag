import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASTLE_SIEGE_DIALS,
  normalizeCastleSiegeDials,
  parseCastleSiegeDials,
} from "./dials";

describe("normalizeCastleSiegeDials", () => {
  it("returns defaults when given an empty partial", () => {
    expect(normalizeCastleSiegeDials()).toEqual(DEFAULT_CASTLE_SIEGE_DIALS);
  });

  it("clamps out-of-range values", () => {
    expect(
      normalizeCastleSiegeDials({
        zoneRadiusMeters: 1,
        turnLengthSeconds: 10_000,
        maxRounds: 0,
        beltWidthMeters: 1,
        breachToleranceMeters: 9999,
        siegeLimitSeconds: 30,
      }),
    ).toEqual({
      zoneRadiusMeters: 100,
      turnLengthSeconds: 3600,
      maxRounds: 1,
      beltWidthMeters: 10,
      breachToleranceMeters: 500,
      siegeLimitSeconds: 60,
    });
  });
});

describe("parseCastleSiegeDials", () => {
  it("returns undefined for non-objects", () => {
    expect(parseCastleSiegeDials(null)).toBeUndefined();
    expect(parseCastleSiegeDials("x")).toBeUndefined();
    expect(parseCastleSiegeDials([])).toBeUndefined();
  });

  it("parses a valid dials map and fills missing keys from defaults", () => {
    expect(parseCastleSiegeDials({ zoneRadiusMeters: 800, maxRounds: 8 })).toEqual(
      normalizeCastleSiegeDials({ zoneRadiusMeters: 800, maxRounds: 8 }),
    );
  });
});
