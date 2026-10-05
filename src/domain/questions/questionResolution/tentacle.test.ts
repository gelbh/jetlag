import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "../../geometry/measuring/measuringGeometryBudgets";
import type { GameArea } from "../../map/annotations";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { resolveTentaclePendingQuestion } from "./tentacle";

const tentacleEliminationJsonForAnswer = vi.hoisted(() => vi.fn());

vi.mock("../../geometry/tentacle/tentacleGeometry", () => ({
  tentacleEliminationJsonForAnswer: (...args: unknown[]) =>
    tentacleEliminationJsonForAnswer(...args),
}));

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

function pending(): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "tentacle",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    promptText: "Tentacle?",
    replyOptions: [{ id: "poi-1", label: "West Museum" }],
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      }),
      metadata: {
        poisJson: JSON.stringify([
          {
            id: "poi-1",
            name: "West Museum",
            lat: 51.46,
            lng: -0.15,
            category: "museum",
          },
        ]),
        centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
        radiusMeters: 1000,
      },
    },
  };
}

describe("resolveTentaclePendingQuestion elim-JSON soft-fail", () => {
  beforeEach(() => {
    tentacleEliminationJsonForAnswer.mockReset();
  });

  it("returns Point annotation without elim JSON when elim throws", async () => {
    tentacleEliminationJsonForAnswer.mockRejectedValue(
      new Error(MEASURING_PERSIST_OVER_BUDGET_MESSAGE),
    );

    const resolved = await resolveTentaclePendingQuestion(pending(), "poi-1", gameArea);

    expect(resolved).not.toBeNull();
    expect(resolved?.geometry.geometry.type).toBe("Point");
    expect(resolved?.metadata.tentacleEliminationJson).toBeUndefined();
    expect(resolved?.metadata.highlightedPoiId).toBe("poi-1");
  });
});
