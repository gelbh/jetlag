import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { AnnotationRecord, GameArea } from "./annotations";
import {
  buildCombinedEliminationMask,
  eliminationFeatureForAnnotation,
} from "./combinedEliminationMask";

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

function matchingAnnotation(
  id: string,
  west: number,
): AnnotationRecord {
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

describe("combinedEliminationMask", () => {
  it("merges multiple elimination regions into one mask", () => {
    const combined = buildCombinedEliminationMask(
      [matchingAnnotation("a", -0.19), matchingAnnotation("b", -0.16)],
      gameArea,
    );

    expect(combined).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!),
    ).toBe(true);
    expect(
      booleanPointInPolygon(turfPoint([-0.155, 51.45]), combined!),
    ).toBe(true);
  });

  it("includes draft preview features with committed eliminations", () => {
    const draft = eliminationFeatureForAnnotation(
      matchingAnnotation("draft", -0.12),
      gameArea,
    );

    expect(draft).not.toBeNull();

    const combined = buildCombinedEliminationMask(
      [matchingAnnotation("a", -0.19)],
      gameArea,
      draft ? [draft] : [],
    );

    expect(combined).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!),
    ).toBe(true);
    expect(
      booleanPointInPolygon(turfPoint([-0.115, 51.45]), combined!),
    ).toBe(true);
  });
});
