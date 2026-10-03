import { describe, expect, it } from "vitest";
import { milesToMeters } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { buildHiderTruthFetchKey } from "./hiderTruthFetchKey";
import type { HiderQuestionTruthContextInput } from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.5, -0.12];
const outsideAsk: [number, number] = [51.6, -0.12];
const insideAsk: [number, number] = [51.5001, -0.1201];

function radarPending(overrides: Partial<PendingQuestionRecord> = {}): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "s1",
    toolType: "radar",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [outsideAsk[1], outsideAsk[0]],
        },
      }),
      metadata: { radiusMeters: milesToMeters(1) },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Radar?",
    ...overrides,
  };
}

function baseContext(
  overrides: Partial<HiderQuestionTruthContextInput> = {},
): HiderQuestionTruthContextInput {
  return {
    hiderUid: "hider-1",
    zoneCenter,
    hidingPlace: [51.5, -0.12],
    zoneRadiusMeters: 500,
    seekerPlacesByUid: { "seeker-1": [51.51, -0.11] },
    session: null,
    ...overrides,
  };
}

describe("buildHiderTruthFetchKey", () => {
  it("omits live hidingPlace regardless of ask placement", () => {
    const outside = [radarPending()];
    const inside = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [insideAsk[1], insideAsk[0]],
            },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    for (const open of [outside, inside]) {
      const a = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.5, -0.12] }));
      const b = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.501, -0.121] }));
      expect(a).toBe(b);
      expect(a).toContain("place:omitted");
    }
  });

  it("omits live hidingPlace during end game", () => {
    const open = [radarPending()];
    const session = {
      endGameStartedAt: "2026-01-01T00:00:00.000Z",
      endGameTruthAnchors: {
        "hider-1": {
          lat: 51.5,
          lng: -0.12,
          frozenAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    const a = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.5, -0.12], session }));
    const b = buildHiderTruthFetchKey(
      open,
      baseContext({ hidingPlace: [51.501, -0.121], session }),
    );
    expect(a).toBe(b);
    expect(a).toContain("place:omitted");
  });

  it("omits live seeker GPS for map-pin tools", () => {
    const open = [
      radarPending({
        toolType: "tentacle",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [insideAsk[1], insideAsk[0]],
            },
          }),
          metadata: {},
        },
      }),
    ];
    const a = buildHiderTruthFetchKey(
      open,
      baseContext({ seekerPlacesByUid: { "seeker-1": [51.51, -0.11] } }),
    );
    const b = buildHiderTruthFetchKey(
      open,
      baseContext({ seekerPlacesByUid: { "seeker-1": [51.52, -0.1] } }),
    );
    expect(a).toBe(b);
    expect(a).toContain("seeker:omitted");
  });

  it("changes when open question placement geometry changes under the same id", () => {
    const openA = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [outsideAsk[1], outsideAsk[0]],
            },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    const openB = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [outsideAsk[1] + 0.01, outsideAsk[0]],
            },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    const context = baseContext();
    expect(buildHiderTruthFetchKey(openA, context)).not.toBe(
      buildHiderTruthFetchKey(openB, context),
    );
  });
});
