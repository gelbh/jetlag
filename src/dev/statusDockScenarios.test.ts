import { describe, expect, it } from "vitest";
import { assertStatusDockScenarioIdsUnique, STATUS_DOCK_SCENARIOS } from "./statusDockScenarios";

describe("statusDockScenarios", () => {
  it("keeps unique scenario ids", () => {
    expect(() => assertStatusDockScenarioIdsUnique()).not.toThrow();
    expect(STATUS_DOCK_SCENARIOS.length).toBeGreaterThanOrEqual(12);
  });
});
