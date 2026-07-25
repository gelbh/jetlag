import { describe, expect, it } from "vitest";
import { buildAdminPrompt } from "./adminPrompt";
import type { IncidentDiagnostics } from "./incidentTypes";

const diagnostics: IncidentDiagnostics = {
  appVersion: "0.9.5",
  route: "/map",
  sessionId: "sess-1",
  sessionCode: "ABCD",
  playerRole: "seeker",
  uid: "uid-1",
  userAgent: "TestAgent/1.0",
  platform: "web",
  online: true,
  visibilityState: "visible",
  lastClientErrors: [
    { name: "GeolocationError", message: "permission denied", at: "2026-07-25T11:59:00Z" },
    { name: "NetworkError", at: "2026-07-25T11:59:30Z" },
  ],
  recentOps: ["open-map", "start-radar"],
  reportedAt: "2026-07-25T12:00:00Z",
};

describe("buildAdminPrompt", () => {
  it("includes the incident id, status, session code and app version", () => {
    const prompt = buildAdminPrompt({
      incidentId: "inc-123",
      status: "open",
      playerNote: "map froze",
      diagnostics,
    });

    expect(prompt).toContain("inc-123");
    expect(prompt).toContain("ABCD");
    expect(prompt).toContain("0.9.5");
    expect(prompt).toContain("/map");
    expect(prompt).toContain("map froze");
  });

  it("lists client error names", () => {
    const prompt = buildAdminPrompt({
      incidentId: "inc-123",
      status: "open",
      playerNote: null,
      diagnostics,
    });

    expect(prompt).toContain("GeolocationError");
    expect(prompt).toContain("NetworkError");
  });

  it("renders placeholders when note, session and errors are absent", () => {
    const prompt = buildAdminPrompt({
      incidentId: "inc-9",
      status: "open",
      playerNote: null,
      diagnostics: {
        ...diagnostics,
        sessionId: null,
        sessionCode: null,
        lastClientErrors: [],
        recentOps: [],
      },
    });

    expect(prompt).toContain("inc-9");
    expect(prompt).toContain("—");
    expect(prompt).not.toContain("undefined");
  });

  it("is deterministic for identical input", () => {
    const input = {
      incidentId: "inc-123",
      status: "chatting" as const,
      playerNote: "hello",
      diagnostics,
    };
    expect(buildAdminPrompt(input)).toBe(buildAdminPrompt(input));
  });
});
