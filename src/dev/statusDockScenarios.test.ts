import { describe, expect, it } from "vitest";
import {
  STATUS_DOCK_SCENARIOS,
  assertStatusDockScenarioIdsUnique,
} from "./statusDockScenarios";

describe("statusDockScenarios", () => {
  it("keeps unique scenario ids", () => {
    expect(() => assertStatusDockScenarioIdsUnique()).not.toThrow();
    expect(STATUS_DOCK_SCENARIOS.length).toBeGreaterThanOrEqual(12);
  });
});
