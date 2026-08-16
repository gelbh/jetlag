import { describe, expect, it } from "vitest";
import exysHospitalTentacle from "./fixtures/exysHospitalTentacle.json";
import {
  TentacleGeometryBudgetError,
  TENTACLE_POI_MAX,
  TENTACLE_POI_OVER_BUDGET_MESSAGE,
} from "./tentacleGeometryBudgets";

describe("tentacleGeometryBudgets", () => {
  it("records EXYS-class 24-site hospital lists under the former cap", () => {
    // Live: session EXYS / pending a4ad8efe-90d3-46cb-a803-b37ef2e307e2
    expect(exysHospitalTentacle.pois).toHaveLength(24);
    expect(exysHospitalTentacle.pois.length).toBeLessThan(TENTACLE_POI_MAX);
  });

  it("TentacleGeometryBudgetError carries a stable code", () => {
    const error = new TentacleGeometryBudgetError(TENTACLE_POI_MAX + 10);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("tentacle_poi_over_budget");
    expect(error.poiCount).toBe(TENTACLE_POI_MAX + 10);
    expect(error.message).toBe(TENTACLE_POI_OVER_BUDGET_MESSAGE);
  });
});
