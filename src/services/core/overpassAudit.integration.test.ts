// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  formatOverpassAuditReport,
  runOverpassAudit,
} from "./overpassAudit";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";

const runLiveAudit =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.RUN_OVERPASS_AUDIT === "1";

describe.runIf(runLiveAudit)("overpass audit integration", () => {
  it(
    "profiles priority Dublin queries against the public Overpass API",
    async () => {
      const { summaries } = await runOverpassAudit(DUBLIN_CITY_GAME_AREA, {
        runsPerCase: 1,
        pauseMs: 2_000,
        caseFilter: (auditCase) =>
          auditCase.id === "admin:6" ||
          auditCase.id === "landmass" ||
          auditCase.id === "coastline" ||
          auditCase.id === "transit:stops" ||
          auditCase.id === "transit:routes" ||
          auditCase.id === "measuring:place:rail_station",
      });

      console.log(formatOverpassAuditReport(summaries));

      const successful = summaries.filter((summary) => summary.successRate > 0);
      if (successful.length === 0) {
        console.warn(
          "Overpass audit: public instances unreachable; harness ran but no live results.",
        );
        return;
      }

      for (const summary of summaries) {
        expect(summary.runs).toBe(1);
        expect(summary.successRate).toBeGreaterThanOrEqual(0);
      }

      expect(successful.length).toBeGreaterThan(0);
    },
    300_000,
  );
});
