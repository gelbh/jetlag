import { describe, expect, it } from "vitest";
import {
  computePressure,
  declareProximityFromDistance,
  nearestAttackerProximityFromDistance,
  type PressureInputs,
  pressureBandForScalar,
} from "./pressure";

const base: PressureInputs = {
  askEliminationRatio: 0.2,
  declareProximity: 0.2,
  shadeCoverageRatio: 0.2,
  nearestAttackerProximity: null,
};

describe("computePressure H5", () => {
  it("emits scalar 0–100 and Skin-S3 bands", () => {
    expect(pressureBandForScalar(0)).toBe("signal");
    expect(pressureBandForScalar(33)).toBe("signal");
    expect(pressureBandForScalar(34)).toBe("flag");
    expect(pressureBandForScalar(66)).toBe("flag");
    expect(pressureBandForScalar(67)).toBe("halt");
    expect(pressureBandForScalar(100)).toBe("halt");
  });

  it("is monotonic when ask/shade tighten (V13)", () => {
    const a = computePressure(base);
    const tighterAsk = computePressure({ ...base, askEliminationRatio: 0.8 });
    const tighterShade = computePressure({ ...base, shadeCoverageRatio: 0.9 });
    const both = computePressure({
      ...base,
      askEliminationRatio: 0.8,
      shadeCoverageRatio: 0.9,
    });
    expect(tighterAsk.scalar).toBeGreaterThanOrEqual(a.scalar);
    expect(tighterShade.scalar).toBeGreaterThanOrEqual(a.scalar);
    expect(both.scalar).toBeGreaterThanOrEqual(tighterAsk.scalar);
    expect(both.scalar).toBeGreaterThanOrEqual(tighterShade.scalar);
  });

  it("blends Siege nearest-attacker proximity without decreasing prior pressure", () => {
    const standoff = computePressure(base);
    const siegeFar = computePressure({ ...base, nearestAttackerProximity: 0.1 });
    const siegeNear = computePressure({ ...base, nearestAttackerProximity: 0.9 });
    expect(siegeNear.scalar).toBeGreaterThanOrEqual(siegeFar.scalar);
    expect(siegeNear.scalar).toBeGreaterThanOrEqual(standoff.scalar - 5);
  });

  it("maps declare distance to proximity", () => {
    expect(declareProximityFromDistance(0)).toBe(1);
    expect(declareProximityFromDistance(2_000)).toBe(0);
    expect(declareProximityFromDistance(1_000)).toBeCloseTo(0.5);
  });

  it("maps attacker distance to zone proximity", () => {
    expect(nearestAttackerProximityFromDistance(100, 500)).toBe(1);
    expect(nearestAttackerProximityFromDistance(500, 500)).toBe(1);
    expect(nearestAttackerProximityFromDistance(2500, 500)).toBe(0);
  });

  it("never embeds coords in the reading", () => {
    const reading = computePressure({ ...base, declareProximity: 0.7 });
    expect(Object.keys(reading).sort()).toEqual(["band", "scalar"]);
  });
});
