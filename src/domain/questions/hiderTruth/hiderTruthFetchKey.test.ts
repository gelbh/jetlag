import { describe, expect, it } from "vitest";
import { milesToMeters } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { buildHiderTruthFetchKey } from "./hiderTruthFetchKey";
import type { HiderQuestionTruthContextInput } from "./resolveHiderTruthReference";

const zoneCenter: [number, number] = [51.5, -0.12];
const outsideAsk: [number, number] = [51.6, -0.12];

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
  return { hiderUid: "hider-1", zoneCenter, session: null, ...overrides };
}

describe("buildHiderTruthFetchKey", () => {
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

  it("changes when the zone center changes or is cleared", () => {
    const open = [radarPending()];
    const set = buildHiderTruthFetchKey(open, baseContext());
    expect(buildHiderTruthFetchKey(open, baseContext({ zoneCenter: [51.6, -0.1] }))).not.toBe(set);
    expect(buildHiderTruthFetchKey(open, baseContext({ zoneCenter: null }))).not.toBe(set);
  });
});
