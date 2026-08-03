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
    expect(assertTentaclePoiBudget(exysHospitalTentacle.pois.length)).toEqual({
      ok: true,
    });
  });

  it("rejects counts above the hard POI cap", () => {
    expect(assertTentaclePoiBudget(TENTACLE_POI_MAX + 1)).toEqual({
      ok: false,
      message: TENTACLE_POI_OVER_BUDGET_MESSAGE,
    });
  });

  it("TentacleGeometryBudgetError carries a stable message", () => {
    const error = new TentacleGeometryBudgetError(TENTACLE_POI_MAX + 10);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("tentacle_poi_over_budget");
    expect(error.message).toBe(TENTACLE_POI_OVER_BUDGET_MESSAGE);
  });
});
