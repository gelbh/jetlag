export const TENTACLE_POI_MAX = 64;

export const TENTACLE_POI_OVER_BUDGET_MESSAGE =
  "Too many places in this tentacle to shade safely. Try a smaller search or another category.";

export class TentacleGeometryBudgetError extends Error {
  readonly code = "tentacle_poi_over_budget" as const;
  readonly poiCount: number;

  constructor(count: number) {
    super(TENTACLE_POI_OVER_BUDGET_MESSAGE);
    this.name = "TentacleGeometryBudgetError";
    this.poiCount = count;
  }
}
