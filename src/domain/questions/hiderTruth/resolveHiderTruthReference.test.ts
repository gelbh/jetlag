import { describe, expect, it } from "vitest";
import { resolveHiderTruthReference } from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.45, -0.15];
const endGameSession = {
  endGameStartedAt: "2026-01-01T00:00:00.000Z",
  endGameTruthAnchors: {
    "hider-1": { lat: 51.46, lng: -0.14, frozenAt: "2026-01-01T00:00:00.000Z" },
  },
};

describe("resolveHiderTruthReference", () => {
  it("returns zone center before end game", () => {
    const result = resolveHiderTruthReference({ hiderUid: "hider-1", zoneCenter, session: null });
    expect(result).toEqual({ point: zoneCenter, mode: "hidingZoneCenter" });
  });

  it("returns noHidingZone before end game when the hider has no zone", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter: null,
      session: null,
    });
    expect(result).toEqual({ point: null, mode: "noHidingZone" });
  });

  it("returns the frozen anchor over the zone center during end game", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      session: endGameSession,
    });
    expect(result).toEqual({ point: [51.46, -0.14], mode: "endGameFreeze" });
  });

  it("returns unavailable during end game when that hider has no anchor", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-2",
      zoneCenter: null,
      session: endGameSession,
    });
    expect(result).toEqual({ point: null, mode: "unavailable" });
  });
});
