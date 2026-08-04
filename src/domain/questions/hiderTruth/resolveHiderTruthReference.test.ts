import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import {
  isAskOriginInsideHidingZone,
  resolveHiderTruthReference,
  resolvePendingQuestionTruthReference,
} from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.45, -0.15];
const liveGps: [number, number] = [51.451, -0.149];
const outsideAsk: [number, number] = [51.48, -0.12];
const insideAsk: [number, number] = [51.4505, -0.1502];
const zoneRadiusMeters = 500;

describe("resolveHiderTruthReference", () => {
  it("returns zone center before end game when ask is outside the zone", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      hidingPlace: liveGps,
      askOrigin: outsideAsk,
      zoneRadiusMeters,
      session: null,
    });

    expect(result.mode).toBe("hidingZoneCenter");
    expect(result.point).toEqual(zoneCenter);
  });

  it("returns hiding place before end game when ask origin is inside the zone", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      hidingPlace: liveGps,
      askOrigin: insideAsk,
      zoneRadiusMeters,
      session: null,
    });

    expect(result.mode).toBe("hidingPlace");
    expect(result.point).toEqual(liveGps);
  });

  it("falls back to zone center when inside zone but hiding place missing", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      hidingPlace: null,
      originInsideZone: true,
      session: null,
    });

    expect(result.mode).toBe("hidingZoneCenter");
    expect(result.point).toEqual(zoneCenter);
  });

  it("returns frozen anchor when end game is active", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter,
      hidingPlace: liveGps,
      originInsideZone: true,
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

  it("prefers freeze over hiding place after end game starts", () => {
    const result = resolveHiderTruthReference({
      hiderUid: "hider-1",
      zoneCenter: liveGps,
      hidingPlace: liveGps,
      originInsideZone: true,
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

describe("isAskOriginInsideHidingZone", () => {
  it("detects ask origins inside the radius", () => {
    expect(
      isAskOriginInsideHidingZone(insideAsk, zoneCenter, zoneRadiusMeters),
    ).toBe(true);
    expect(
      isAskOriginInsideHidingZone(outsideAsk, zoneCenter, zoneRadiusMeters),
    ).toBe(false);
    expect(isAskOriginInsideHidingZone(zoneCenter, zoneCenter, 0)).toBe(true);
  });

  it("rejects invalid zone radii", () => {
    expect(isAskOriginInsideHidingZone(insideAsk, zoneCenter, -1)).toBe(false);
    expect(isAskOriginInsideHidingZone(insideAsk, zoneCenter, Number.NaN)).toBe(
      false,
    );
  });
});

describe("resolvePendingQuestionTruthReference", () => {
  function pendingAt(origin: [number, number]): PendingQuestionRecord {
    return {
      id: "q-1",
      status: "pending",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [origin[1], origin[0]],
          },
        }),
      },
    } as PendingQuestionRecord;
  }

  it("uses hiding place for in-zone asks and zone center outside", () => {
    const context = {
      hiderUid: "hider-1",
      zoneCenter,
      hidingPlace: liveGps,
      zoneRadiusMeters,
      session: null,
    };

    expect(
      resolvePendingQuestionTruthReference(pendingAt(insideAsk), context),
    ).toEqual({ point: liveGps, mode: "hidingPlace" });
    expect(
      resolvePendingQuestionTruthReference(pendingAt(outsideAsk), context),
    ).toEqual({ point: zoneCenter, mode: "hidingZoneCenter" });
  });

  it("falls back to zone center for empty photo geometryJson", () => {
    const photoPending = {
      id: "q-photo",
      status: "pending",
      placement: { geometryJson: "{}" },
    } as PendingQuestionRecord;

    expect(
      resolvePendingQuestionTruthReference(photoPending, {
        hiderUid: "hider-1",
        zoneCenter,
        hidingPlace: liveGps,
        zoneRadiusMeters,
        session: null,
      }),
    ).toEqual({ point: zoneCenter, mode: "hidingZoneCenter" });
  });
});
