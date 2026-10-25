import { describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import { renderAnnotationLayerItem } from "./annotationLayerRegistry";

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

function tentacleAnnotation(): AnnotationRecord {
  return {
    id: "ann-tentacle",
    sessionId: "local",
    type: "tentacle",
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-6.26, 53.35] },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      radiusMeters: 1609,
    },
  };
}

describe("renderAnnotationLayerItem tentacle", () => {
  it("returns null for committed tentacle points", () => {
    const node = renderAnnotationLayerItem({
      annotation: tentacleAnnotation(),
      gameArea,
      selectedAnnotationId: null,
      selectionEnabled: true,
      selectAnnotation: vi.fn(),
    });
    expect(node).toBeNull();
  });
});
