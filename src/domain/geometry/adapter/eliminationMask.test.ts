import { describe, expect, it } from "vitest";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { computeEliminationUnionInput } from "./eliminationMask";

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

function matchingAnnotation(id: string, west: number): AnnotationRecord {
  return {
    id,
    sessionId: "session",
    status: "active",
    type: "matching",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, 51.42],
            [west + 0.03, 51.42],
            [west + 0.03, 51.48],
            [west, 51.48],
            [west, 51.42],
          ],
        ],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      color: "#ef4444",
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 51.45, lng: west + 0.015 },
    },
  };
}

describe("adapter/eliminationMask", () => {
  it("maps matching annotations to polygon union input", () => {
    const input = computeEliminationUnionInput(
      [matchingAnnotation("a", -0.18)],
      gameArea,
      [],
    );
    expect(input.polygons).toHaveLength(1);
    expect(input.disks).toHaveLength(0);
  });
});
