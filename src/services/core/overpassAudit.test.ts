import { describe, expect, it } from "vitest";
import {
  buildOverpassAuditCases,
  formatOverpassAuditReport,
  summarizeOverpassAuditRuns,
  type OverpassAuditRunResult,
} from "./overpassAudit";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";

describe("overpassAudit", () => {
  it("builds audit cases for admin, landmass, measuring, and transit", () => {
    const cases = buildOverpassAuditCases(DUBLIN_CITY_GAME_AREA);
    const ids = cases.map((auditCase) => auditCase.id);

    expect(ids).toContain("admin:6");
    expect(ids).toContain("landmass");
    expect(ids).toContain("coastline");
    expect(ids).toContain("transit:stops");
    expect(ids).toContain("transit:routes");
    expect(ids.some((id) => id.startsWith("measuring:place:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("measuring:linear:"))).toBe(true);
  });

  it("summarizes audit runs with timeout and latency stats", () => {
    const runs: OverpassAuditRunResult[] = [
      {
        caseId: "admin:6",
        endpoint: "https://overpass-api.de/api/interpreter",
        status: 200,
        latencyMs: 1_000,
        byteSize: 2_000,
        elementCount: 10,
        timedOut: false,
      },
      {
        caseId: "admin:6",
        endpoint: "https://overpass-api.de/api/interpreter",
        status: 504,
        latencyMs: 45_000,
        byteSize: 0,
        elementCount: 0,
        timedOut: true,
        error: "gateway timeout",
      },
    ];

    const summary = summarizeOverpassAuditRuns("admin:6", "admin", runs);

    expect(summary.successRate).toBe(0.5);
    expect(summary.timeoutRate).toBe(0.5);
    expect(summary.latencyP50Ms).toBe(1_000);
    expect(summary.avgElementCount).toBe(10);
  });

  it("formats a tab-separated audit report", () => {
    const report = formatOverpassAuditReport([
      {
        caseId: "landmass",
        tool: "landmass",
        runs: 2,
        successRate: 0.5,
        timeoutRate: 0.5,
        latencyP50Ms: 3_000,
        latencyP95Ms: 45_000,
        avgByteSize: 120_000,
        avgElementCount: 80,
      },
    ]);

    expect(report).toContain("caseId\ttool\tsuccessRate");
    expect(report).toContain("landmass");
  });
});
