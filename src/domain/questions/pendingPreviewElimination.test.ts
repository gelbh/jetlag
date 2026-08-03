import { describe, expect, it } from "vitest";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import { milesToMeters } from "../map/distance";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import {
  buildPendingPreviewEliminationFeature,
  pendingQuestionHasResolvedAnnotation,
} from "./overlays/pendingPreviewElimination";
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

function pendingRadar(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-radar",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
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
    ...overrides,
  };
}

describe("pending preview elimination", () => {
  it("builds hider-truth preview shade for pending radar without polygon on geometry overlay", async () => {
    const pending = pendingRadar();
    const geometryOverlay = await buildPendingQuestionOverlay(pending, gameArea);
    expect(
      geometryOverlay?.overlays.some((overlay) => overlay.kind === "polygon"),
    ).toBe(false);

    const previewShade = await buildPendingPreviewEliminationFeature({
      pending,
      replyId: "no",
      gameArea,
    });
    expect(previewShade?.geometry.type).toBe("Polygon");
  });

  it("skips preview shade once the resolved annotation is active", () => {
    const pending = pendingRadar({ status: "answered", answer: "no" });
    const annotations: AnnotationRecord[] = [
      {
        id: pending.id,
        sessionId: pending.sessionId,
        status: "active",
        type: "radar",
        geometry: JSON.parse(pending.placement.geometryJson),
        metadata: {
          createdAt: pending.createdAt,
          radiusMeters: milesToMeters(1),
          inside: false,
        },
      },
    ];

    expect(pendingQuestionHasResolvedAnnotation(pending, annotations)).toBe(true);
  });
});
