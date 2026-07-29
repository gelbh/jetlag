import { describe, expect, it } from "vitest";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import { eliminationFeatureForAnnotationTs } from "../geometry/adapter/eliminationMask";
import { milesToMeters } from "../map/distance";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { buildPendingQuestionOverlay } from "./pendingQuestionOverlays";

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

function pendingRadar(status: PendingQuestionRecord["status"]): PendingQuestionRecord {
  return {
    id: "pq-radar",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status,
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [-0.15, 51.45],
        },
      }),
      metadata: { radiusMeters: milesToMeters(1) },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Are you within 1 mi of me?",
  };
}

function answeredRadarAnnotation(): AnnotationRecord {
  return {
    id: "ann-radar",
    sessionId: "session-1",
    status: "active",
    type: "radar",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [-0.15, 51.45],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      radiusMeters: milesToMeters(1),
      inside: false,
    },
  };
}

describe("answered overlay regression", () => {
  it("drops pending radar/thermometer overlays after answer so they cannot double-shade", () => {
    expect(
      buildPendingQuestionOverlay(pendingRadar("answered"), gameArea),
    ).toBeNull();
    expect(
      buildPendingQuestionOverlay(
        {
          ...pendingRadar("answered"),
          id: "pq-thermo",
          toolType: "thermometer",
          placement: {
            geometryJson: JSON.stringify({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [-0.16, 51.44],
                  [-0.14, 51.46],
                ],
              },
            }),
            metadata: {
              thermometerDistanceMeters: milesToMeters(0.5),
            },
          },
        },
        gameArea,
      ),
    ).toBeNull();
  });

  it("keeps answered radar elimination on the annotation while pending has no polygon shade", () => {
    const pending = buildPendingQuestionOverlay(pendingRadar("pending"), gameArea);
    expect(pending?.overlays.some((overlay) => overlay.kind === "polygon")).toBe(
      false,
    );

    const answeredShade = eliminationFeatureForAnnotationTs(
      answeredRadarAnnotation(),
      gameArea,
    );
    expect(answeredShade).not.toBeNull();
    expect(answeredShade?.geometry.type).toBe("Polygon");
  });
});
