import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePressure,
  declareProximityFromDistance,
  pressureBandForScalar,
  shadeCoverageFromGeometryJson,
} from "../session/castleSiege/pressure.mjs";

describe("castleSiege pressure H5", () => {
  it("is monotonic when ask and shade tighten (V13)", () => {
    const base = {
      askEliminationRatio: 0.2,
      declareProximity: 0.2,
      shadeCoverageRatio: 0.2,
      nearestAttackerProximity: null,
    };
    const a = computePressure(base);
    const b = computePressure({ ...base, askEliminationRatio: 0.9, shadeCoverageRatio: 0.9 });
    assert.ok(b.scalar >= a.scalar);
  });

  it("bands match Skin-S3 thresholds", () => {
    assert.equal(pressureBandForScalar(10), "signal");
    assert.equal(pressureBandForScalar(50), "flag");
    assert.equal(pressureBandForScalar(80), "halt");
  });

  it("shade proxy grows with geometryJson length", () => {
    assert.equal(shadeCoverageFromGeometryJson(""), 0);
    assert.ok(shadeCoverageFromGeometryJson("x".repeat(25_000)) > 0.4);
    assert.equal(shadeCoverageFromGeometryJson("x".repeat(60_000)), 1);
  });

  it("declare proximity falls with distance", () => {
    assert.equal(declareProximityFromDistance(0), 1);
    assert.ok(declareProximityFromDistance(500) > declareProximityFromDistance(1500));
  });
});
