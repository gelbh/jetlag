import type { Feature, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../../map/annotations";
import { eliminationAnnotationsContentKey, isAddOnly } from "./eliminationAnnotationKey";

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

    expect(eliminationAnnotationsContentKey([a, b])).toBe(eliminationAnnotationsContentKey([b, a]));
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

describe("eliminationAnnotationsContentKey mask metadata", () => {
  it("changes when radar radiusMeters or inside changes with same Point geometry", () => {
    const base = radarAnnotation("radar", false, 800);
    const radiusEdit = radarAnnotation("radar", false, 1200);
    const insideEdit = radarAnnotation("radar", true, 800);

    expect(eliminationAnnotationsContentKey([base])).not.toBe(
      eliminationAnnotationsContentKey([radiusEdit]),
    );
    expect(eliminationAnnotationsContentKey([base])).not.toBe(
      eliminationAnnotationsContentKey([insideEdit]),
    );
  });

  it("changes when tentacleEliminationJson changes with same Point geometry", () => {
    const point = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [-0.15, 51.45] as [number, number],
      },
    };
    const elimA = JSON.stringify(polygonFeature(-0.19));
    const elimB = JSON.stringify(polygonFeature(-0.16));
    const a: AnnotationRecord = {
      id: "tent",
      sessionId: "session",
      status: "active",
      type: "tentacle",
      geometry: point,
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        tentacleEliminationJson: elimA,
      },
    };
    const b: AnnotationRecord = {
      ...a,
      metadata: { ...a.metadata, tentacleEliminationJson: elimB },
    };

    expect(eliminationAnnotationsContentKey([a])).not.toBe(eliminationAnnotationsContentKey([b]));
  });

  it("changes when thermometerAnswer changes with same LineString geometry", () => {
    const line = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-0.18, 51.42],
          [-0.12, 51.48],
        ] as [number, number][],
      },
    };
    const hot: AnnotationRecord = {
      id: "thermo",
      sessionId: "session",
      status: "active",
      type: "thermometer",
      geometry: line,
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        thermometerAnswer: "hotter",
      },
    };
    const cold: AnnotationRecord = {
      ...hot,
      metadata: { ...hot.metadata, thermometerAnswer: "colder" },
    };

    expect(eliminationAnnotationsContentKey([hot])).not.toBe(
      eliminationAnnotationsContentKey([cold]),
    );
  });

  it("changes when measuringRegionInputJson changes with same Point geometry", () => {
    const point = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [-0.15, 51.45] as [number, number],
      },
    };
    const a: AnnotationRecord = {
      id: "meas",
      sessionId: "session",
      status: "active",
      type: "measuring",
      geometry: point,
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        measuringAnswer: "closer",
        measuringRegionInputJson: '{"kind":"a"}',
      },
    };
    const b: AnnotationRecord = {
      ...a,
      metadata: { ...a.metadata, measuringRegionInputJson: '{"kind":"b"}' },
    };

    expect(eliminationAnnotationsContentKey([a])).not.toBe(eliminationAnnotationsContentKey([b]));
  });

  it("is not add-only when mask metadata changes for an existing id", () => {
    const base = radarAnnotation("radar", false, 800);
    const prevKey = eliminationAnnotationsContentKey([base]);
    const edited = radarAnnotation("radar", false, 1200);

    expect(isAddOnly(prevKey, [edited])).toEqual({ addOnly: false });
  });
});

function radarAnnotation(id: string, inside: boolean, radiusMeters: number): AnnotationRecord {
  return {
    id,
    sessionId: "session",
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
      inside,
      radiusMeters,
    },
  };
}
