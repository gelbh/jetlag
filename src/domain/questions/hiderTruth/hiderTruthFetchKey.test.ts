import { describe, expect, it } from "vitest";
import { milesToMeters } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { buildHiderTruthFetchKey } from "./hiderTruthFetchKey";
import type { HiderQuestionTruthContextInput } from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.5, -0.12];
const outsideAsk: [number, number] = [51.6, -0.12]; // far from zone
const insideAsk: [number, number] = [51.5001, -0.1201];

function radarPending(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
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
        geometry: { type: "Point", coordinates: [outsideAsk[1], outsideAsk[0]] },
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
  it("omits hidingPlace when open radar ask is outside the zone", () => {
    const open = [radarPending()];
    const a = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.5, -0.12] }));
    const b = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.501, -0.121] }));
    expect(a).toBe(b);
  });

  it("includes hidingPlace when open radar ask is inside the zone", () => {
    const open = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [insideAsk[1], insideAsk[0]] },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    const a = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.5, -0.12] }));
    const b = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: [51.501, -0.121] }));
    expect(a).not.toBe(b);
  });

  it("omits hidingPlace during end game even when ask is inside the zone", () => {
    const open = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [insideAsk[1], insideAsk[0]] },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    const session = {
      endGameStartedAt: "2026-01-01T00:00:00.000Z",
      endGameTruthAnchors: { "hider-1": { lat: 51.5, lng: -0.12 } },
    };
    const a = buildHiderTruthFetchKey(
      open,
      baseContext({ hidingPlace: [51.5, -0.12], session }),
    );
    const b = buildHiderTruthFetchKey(
      open,
      baseContext({ hidingPlace: [51.501, -0.121], session }),
    );
    expect(a).toBe(b);
    expect(a).toContain("place:omitted");
  });

  it("still includes hidingPlace slot when in-zone but place is null (first fix)", () => {
    const open = [
      radarPending({
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [insideAsk[1], insideAsk[0]] },
          }),
          metadata: { radiusMeters: milesToMeters(1) },
        },
      }),
    ];
    const without = buildHiderTruthFetchKey(open, baseContext({ hidingPlace: null }));
    const withPlace = buildHiderTruthFetchKey(
      open,
      baseContext({ hidingPlace: [51.5, -0.12] }),
    );
    expect(without).not.toBe(withPlace);
  });
});
