import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import {
  deferredPointFromPendingPlacement,
  seekerAnchorPointFeature,
} from "./deferredSeekerPoint";

function basePending(overrides: Partial<PendingQuestionRecord> = {}): PendingQuestionRecord {
  return {
    id: "p1",
    sessionId: "s1",
    toolType: "measuring",
    promptText: "prompt",
    replyOptions: [],
    status: "pending",
    createdAt: new Date().toISOString(),
    createdByUid: "u1",
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      }),
      metadata: {},
    },
    ...overrides,
  };
}

describe("seekerAnchorPointFeature", () => {
  it("builds Point coords as [lng, lat]", () => {
    const feature = seekerAnchorPointFeature([51.45, -0.15]);
    expect(feature.geometry.type).toBe("Point");
    expect(feature.geometry.coordinates).toEqual([-0.15, 51.45]);
  });
});

describe("deferredPointFromPendingPlacement", () => {
  it("uses Point geometryJson when present", () => {
    const pending = basePending();
    const point = deferredPointFromPendingPlacement(pending);
    expect(point?.geometry.coordinates).toEqual([-0.15, 51.45]);
  });

  it("falls back to measuring metadata anchor", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
        metadata: {
          measuringAnchor: { lat: 51.5, lng: -0.2 },
        },
      },
    });

    const point = deferredPointFromPendingPlacement(pending);
    expect(point?.geometry.coordinates).toEqual([-0.2, 51.5]);
  });

  it("falls back to matching metadata anchor", () => {
    const pending = basePending({
      toolType: "matching",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
        metadata: {
          matchingAnchor: { lat: 51.4, lng: -0.1 },
        },
      },
    });

    const point = deferredPointFromPendingPlacement(pending);
    expect(point?.geometry.coordinates).toEqual([-0.1, 51.4]);
  });

  it("returns null when geometry and anchors are missing", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }),
        metadata: {},
      },
    });

    expect(deferredPointFromPendingPlacement(pending)).toBeNull();
  });
});
