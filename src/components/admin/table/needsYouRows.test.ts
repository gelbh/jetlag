import { describe, expect, it } from "vitest";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import type { PreloadRequest } from "@/domain/preloadRequest/preloadRequestTypes";
import { countOpenNeedsYou, toNeedsYouRows } from "./needsYouRows";

const at = "2026-10-18T10:00:00.000Z";
const nowMs = Date.parse("2026-10-18T12:00:00.000Z");

function incident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "inc-1",
    status: "open",
    createdAt: at,
    updatedAt: at,
    sessionId: "s1",
    sessionCode: "7G2LJH",
    reporterUid: "u1",
    reporterRole: "seeker",
    playerNote: "map froze",
    diagnostics: {
      appVersion: "0.9.5",
      route: "/map",
      sessionId: "s1",
      sessionCode: "7G2LJH",
      playerRole: "seeker",
      uid: "u1",
      userAgent: "T",
      platform: "web",
      online: true,
      visibilityState: "visible",
      lastClientErrors: [],
      recentOps: [],
      reportedAt: at,
    },
    adminPrompt: "The map froze. More detail follows.",
    ...overrides,
  };
}

function request(overrides: Partial<PreloadRequest> = {}): PreloadRequest {
  return {
    id: "req-1",
    createdAt: at,
    updatedAt: at,
    status: "open",
    reporterUid: "u1",
    presetSnapshot: {
      name: "Dublin core",
      placeLabel: "Dublin",
      gameSize: "medium",
      distanceUnit: "metric",
    },
    ...overrides,
  } as PreloadRequest;
}

const opts = { showClosed: false, nowMs };

describe("toNeedsYouRows", () => {
  it("summarises a player note, trimmed", () => {
    const [row] = toNeedsYouRows([incident({ playerNote: "  map froze  " })], [], opts);
    expect(row.summary).toBe("map froze");
    expect(row.kind).toBe("incident");
    expect(row.code).toBe("7G2LJH");
    expect(row.platform).toBe("web");
    expect(row.appVersion).toBe("0.9.5");
  });

  it("falls back to the PostHog alert name", () => {
    const [row] = toNeedsYouRows(
      [
        incident({
          playerNote: null,
          posthogIssue: { id: "i", name: "TypeError in map", url: null },
        }),
      ],
      [],
      opts,
    );
    expect(row.summary).toBe("TypeError in map");
  });

  it("falls back to the first sentence of the prompt, then a placeholder", () => {
    const [row] = toNeedsYouRows([incident({ playerNote: null })], [], opts);
    expect(row.summary).toBe("The map froze.");
    const [empty] = toNeedsYouRows([incident({ playerNote: null, adminPrompt: "  " })], [], opts);
    expect(empty.summary).toBe("No note from the player");
  });

  it("summarises a preload with place and size, and has no code", () => {
    const [row] = toNeedsYouRows([], [request()], opts);
    expect(row.summary).toBe("Dublin · medium");
    expect(row.kind).toBe("preload");
    expect(row.code).toBeNull();
    expect(row.status.label).toBe("OPEN");
    const [named] = toNeedsYouRows(
      [],
      [
        request({
          presetSnapshot: { name: "Dublin core", gameSize: "small", distanceUnit: "metric" },
        }),
      ],
      opts,
    );
    expect(named.summary).toBe("Dublin core · small");
  });

  it("hides closed rows unless showClosed, and counts open rows", () => {
    const incidents = [
      incident({ id: "a" }),
      incident({ id: "b", status: "resolved" }),
      incident({ id: "c", status: "dismissed" }),
    ];
    const requests = [request({ id: "r1" }), request({ id: "r2", status: "shipped" })];
    const open = toNeedsYouRows(incidents, requests, opts);
    expect(open.map((r) => r.key)).toEqual(["incident:a", "preload:r1"]);
    const all = toNeedsYouRows(incidents, requests, { ...opts, showClosed: true });
    expect(all).toHaveLength(5);
    expect(countOpenNeedsYou(all)).toBe(2);
    expect(countOpenNeedsYou(open)).toBe(2);
  });

  it("labels incident progress", () => {
    const [row] = toNeedsYouRows([incident({ status: "mitigating" })], [], opts);
    expect(row.status).toEqual({ tone: "info", label: "Diagnosed" });
  });
});
