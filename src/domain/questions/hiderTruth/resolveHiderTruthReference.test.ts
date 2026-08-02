import { describe, expect, it } from "vitest";
import { resolveHiderTruthReference } from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.45, -0.15];
const liveGps: [number, number] = [51.48, -0.12];

describe("resolveHiderTruthReference", () => {
  it("returns zone center before end game", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      session: null,
    });

    expect(result.mode).toBe("hidingZoneCenter");
    expect(result.point).toEqual(zoneCenter);
  });

  it("returns frozen anchor when end game is active", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      session: {
        endGameStartedAt: "2026-01-01T00:00:00.000Z",
        endGameTruthAnchors: {
          "hider-1": {
            lat: 51.46,
            lng: -0.14,
            frozenAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    });

    expect(result.mode).toBe("endGameFreeze");
    expect(result.point).toEqual([51.46, -0.14]);
  });

  it("prefers freeze over zone center after end game starts", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter: liveGps,
      session: {
        endGameStartedAt: "2026-01-01T00:00:00.000Z",
        endGameTruthAnchors: {
          "hider-1": {
            lat: 51.46,
            lng: -0.14,
            frozenAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    });

    expect(result.mode).toBe("endGameFreeze");
    expect(result.point).toEqual([51.46, -0.14]);
    expect(result.point).not.toEqual(liveGps);
  });

  it("returns unavailable when end game is active without that hider anchor", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-2",
      zoneCenter: null,
      session: {
        endGameStartedAt: "2026-01-01T00:00:00.000Z",
        endGameTruthAnchors: {
          "hider-1": {
            lat: 51.46,
            lng: -0.14,
            frozenAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    });

    expect(result.mode).toBe("unavailable");
    expect(result.point).toBeNull();
  });

  it("returns unavailable when no zone center before end game", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter: null,
      session: null,
    });

    expect(result.mode).toBe("unavailable");
    expect(result.point).toBeNull();
  });
});
