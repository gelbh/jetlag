import { describe, expect, it } from "vitest";
import exysHospitalTentacle from "./fixtures/exysHospitalTentacle.json";
import {
  assertTentaclePoiBudget,
  TentacleGeometryBudgetError,
  TENTACLE_POI_MAX,
  TENTACLE_POI_OVER_BUDGET_MESSAGE,
} from "./tentacleGeometryBudgets";

describe("tentacleGeometryBudgets", () => {
  it("allows EXYS-class 24-site hospital lists", () => {
    // Live: session EXYS / pending a4ad8efe-90d3-46cb-a803-b37ef2e307e2
    expect(exysHospitalTentacle.pois).toHaveLength(24);
    expect(() =>
      assertTentaclePoiBudget(exysHospitalTentacle.pois.length),
    ).not.toThrow();
  });

  it("throws when POI count exceeds the hard cap", () => {
    expect(() => assertTentaclePoiBudget(TENTACLE_POI_MAX + 1)).toThrow(
      TentacleGeometryBudgetError,
    );
    expect(() => assertTentaclePoiBudget(TENTACLE_POI_MAX + 1)).toThrow(
      TENTACLE_POI_OVER_BUDGET_MESSAGE,
    );
  });

  it("TentacleGeometryBudgetError carries a stable code", () => {
    const error = new TentacleGeometryBudgetError(TENTACLE_POI_MAX + 10);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("tentacle_poi_over_budget");
    expect(error.poiCount).toBe(TENTACLE_POI_MAX + 10);
    expect(error.message).toBe(TENTACLE_POI_OVER_BUDGET_MESSAGE);
  });
});
