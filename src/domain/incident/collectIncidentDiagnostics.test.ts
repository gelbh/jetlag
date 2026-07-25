import { describe, expect, it } from "vitest";
import { collectIncidentDiagnostics } from "./collectIncidentDiagnostics";
import {
  INCIDENT_MAX_CLIENT_ERRORS,
  INCIDENT_MAX_ERROR_MESSAGE_LENGTH,
  INCIDENT_MAX_OP_LENGTH,
  INCIDENT_MAX_RECENT_OPS,
  INCIDENT_MAX_USER_AGENT_LENGTH,
  type IncidentClientError,
} from "./incidentTypes";

const base = {
  appVersion: "0.9.5",
  route: "/map",
};

describe("collectIncidentDiagnostics", () => {
  it("normalizes optional fields to null/defaults", () => {
    const diagnostics = collectIncidentDiagnostics({ ...base });

    expect(diagnostics.sessionId).toBeNull();
    expect(diagnostics.sessionCode).toBeNull();
    expect(diagnostics.playerRole).toBeNull();
    expect(diagnostics.uid).toBeNull();
    expect(diagnostics.platform).toBe("web");
    expect(diagnostics.online).toBe(true);
    expect(diagnostics.userAgent).toBe("");
    expect(diagnostics.visibilityState).toBe("visible");
    expect(diagnostics.lastClientErrors).toEqual([]);
    expect(diagnostics.recentOps).toEqual([]);
    expect(diagnostics.mapViewport).toBeUndefined();
  });

  it("passes through provided values", () => {
    const diagnostics = collectIncidentDiagnostics({
      ...base,
      sessionId: "sess-1",
      sessionCode: "ABCD",
      playerRole: "hider",
      uid: "uid-1",
      platform: "capacitor",
      online: false,
      visibilityState: "hidden",
      mapViewport: { zoom: 12, center: { lat: 1, lng: 2 } },
    });

    expect(diagnostics.sessionId).toBe("sess-1");
    expect(diagnostics.sessionCode).toBe("ABCD");
    expect(diagnostics.playerRole).toBe("hider");
    expect(diagnostics.uid).toBe("uid-1");
    expect(diagnostics.platform).toBe("capacitor");
    expect(diagnostics.online).toBe(false);
    expect(diagnostics.visibilityState).toBe("hidden");
    expect(diagnostics.mapViewport).toEqual({
      zoom: 12,
      center: { lat: 1, lng: 2 },
    });
  });

  it("keeps only the most recent client errors within the cap", () => {
    const errors: IncidentClientError[] = Array.from(
      { length: INCIDENT_MAX_CLIENT_ERRORS + 5 },
      (_, i) => ({ name: `Err${i}`, at: `2026-07-25T00:00:0${i % 10}Z` }),
    );

    const diagnostics = collectIncidentDiagnostics({
      ...base,
      lastClientErrors: errors,
    });

    expect(diagnostics.lastClientErrors).toHaveLength(INCIDENT_MAX_CLIENT_ERRORS);
    // Most-recent (tail) errors are retained.
    expect(diagnostics.lastClientErrors[0]?.name).toBe("Err5");
    expect(
      diagnostics.lastClientErrors[INCIDENT_MAX_CLIENT_ERRORS - 1]?.name,
    ).toBe(`Err${INCIDENT_MAX_CLIENT_ERRORS + 4}`);
  });

  it("keeps only the most recent recent-ops within the cap", () => {
    const ops = Array.from(
      { length: INCIDENT_MAX_RECENT_OPS + 3 },
      (_, i) => `op-${i}`,
    );

    const diagnostics = collectIncidentDiagnostics({ ...base, recentOps: ops });

    expect(diagnostics.recentOps).toHaveLength(INCIDENT_MAX_RECENT_OPS);
    expect(diagnostics.recentOps[0]).toBe("op-3");
  });

  it("truncates over-long error messages, ops, and user agent", () => {
    const diagnostics = collectIncidentDiagnostics({
      ...base,
      userAgent: "u".repeat(INCIDENT_MAX_USER_AGENT_LENGTH + 50),
      lastClientErrors: [
        { name: "Boom", message: "m".repeat(INCIDENT_MAX_ERROR_MESSAGE_LENGTH + 50), at: "2026-07-25T00:00:00Z" },
      ],
      recentOps: ["o".repeat(INCIDENT_MAX_OP_LENGTH + 50)],
    });

    expect(diagnostics.userAgent).toHaveLength(INCIDENT_MAX_USER_AGENT_LENGTH);
    expect(diagnostics.lastClientErrors[0]?.message).toHaveLength(
      INCIDENT_MAX_ERROR_MESSAGE_LENGTH,
    );
    expect(diagnostics.recentOps[0]).toHaveLength(INCIDENT_MAX_OP_LENGTH);
  });

  it("uses the injected clock for reportedAt when not provided", () => {
    const diagnostics = collectIncidentDiagnostics({
      ...base,
      now: () => new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(diagnostics.reportedAt).toBe("2026-07-25T12:00:00.000Z");
  });

  it("prefers an explicit reportedAt over the clock", () => {
    const diagnostics = collectIncidentDiagnostics({
      ...base,
      reportedAt: "2020-01-01T00:00:00.000Z",
      now: () => new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(diagnostics.reportedAt).toBe("2020-01-01T00:00:00.000Z");
  });
});
