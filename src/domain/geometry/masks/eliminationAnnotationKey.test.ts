import type { Feature, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../../map/annotations";
import {
  eliminationAnnotationsContentKey,
  isAddOnly,
} from "./eliminationAnnotationKey";

function polygonFeature(west: number): Feature<Polygon> {
  return {
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
  };
}

function matchingAnnotation(id: string, west: number): AnnotationRecord {
  return {
    id,
    sessionId: "session",
    status: "active",
    type: "matching",
    geometry: polygonFeature(west),
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      color: "#ef4444",
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 51.45, lng: west + 0.015 },
    },
  };
}

describe("eliminationAnnotationsContentKey", () => {
  it("returns the same key for the same annotations regardless of order", () => {
    const a = matchingAnnotation("a", -0.19);
    const b = matchingAnnotation("b", -0.16);

    expect(eliminationAnnotationsContentKey([a, b])).toBe(
      eliminationAnnotationsContentKey([b, a]),
    );
  });

  it("changes when an annotation id is added", () => {
    const a = matchingAnnotation("a", -0.19);
    const b = matchingAnnotation("b", -0.16);

    expect(eliminationAnnotationsContentKey([a])).not.toBe(
      eliminationAnnotationsContentKey([a, b]),
    );
  });
});

describe("isAddOnly", () => {
  it("detects add-only growth with newIds", () => {
    const a = matchingAnnotation("a", -0.19);
    const b = matchingAnnotation("b", -0.16);
    const prevKey = eliminationAnnotationsContentKey([a]);

    expect(isAddOnly(prevKey, [a, b])).toEqual({
      addOnly: true,
      newIds: ["b"],
    });
  });

  it("is not add-only when an id is removed", () => {
    const a = matchingAnnotation("a", -0.19);
    const b = matchingAnnotation("b", -0.16);
    const prevKey = eliminationAnnotationsContentKey([a, b]);

    expect(isAddOnly(prevKey, [a])).toEqual({ addOnly: false });
  });

  it("is not add-only when geometry fingerprint changes", () => {
    const a = matchingAnnotation("a", -0.19);
    const prevKey = eliminationAnnotationsContentKey([a]);
    const edited = matchingAnnotation("a", -0.18);

    expect(isAddOnly(prevKey, [edited])).toEqual({ addOnly: false });
  });

  it("is not add-only for the first annotation (empty prior key)", () => {
    const a = matchingAnnotation("a", -0.19);

    expect(isAddOnly("", [a])).toEqual({ addOnly: false });
  });
});
