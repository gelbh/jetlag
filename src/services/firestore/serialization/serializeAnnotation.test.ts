import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "@/domain/map/annotations";
import { assertNoNestedArrays } from "./shared";
import {
  deserializeAnnotationFromFirestore,
  serializeAnnotationForFirestore,
} from "./serializeAnnotation";

describe("serializeAnnotation", () => {
  it("omits undefined metadata fields from Firestore payloads", () => {
    const annotation: AnnotationRecord = {
      id: "ann-2",
      sessionId: "session-1",
      type: "thermometer",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
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
        },
      },
      metadata: {
        createdAt: "2026-05-14T00:00:00.000Z",
        measuringSubject: "sea_level",
        measuringLocationCategory: undefined,
        measuringTargetName: undefined,
      },
      status: "active",
    };

    const serialized = serializeAnnotationForFirestore(annotation);

    expect(serialized.metadata).toEqual({
      createdAt: "2026-05-14T00:00:00.000Z",
      measuringSubject: "sea_level",
    });
    expect(() => assertNoNestedArrays(serialized)).not.toThrow();
  });

  it("serializes matching annotations without undefined metadata", () => {
    const annotation: AnnotationRecord = {
      id: "ann-3",
      sessionId: "session-1",
      type: "matching",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [-6.26, 53.35],
        },
      },
      metadata: {
        createdAt: "2026-05-14T00:00:00.000Z",
        matchingCategory: "commercial_airport",
        matchingAnswer: "yes",
        matchingAnchor: { lat: 53.35, lng: -6.26 },
        matchingNearestFeatureId: "123",
        matchingNearestFeatureName: "Dublin Airport",
        matchingNearestFeaturePoint: { lat: 53.35, lng: -6.26 },
        matchingDistanceMeters: undefined,
        matchingFeatureCount: 2,
        matchingNullAnswer: false,
        matchingBoundaryJson: '{"type":"Feature"}',
        matchingFeaturesJson:
          '[{"id":"123","name":"Dublin Airport","point":[53.35,-6.26]}]',
        color: "#ef4444",
      },
      status: "active",
    };

    const serialized = serializeAnnotationForFirestore(annotation);

    expect(serialized.type).toBe("matching");
    expect(serialized.metadata).not.toHaveProperty("matchingDistanceMeters");
    expect(() => assertNoNestedArrays(serialized)).not.toThrow();
  });

  it("round-trips annotation geometry through JSON", () => {
    const annotation: AnnotationRecord = {
      id: "ann-1",
      sessionId: "session-1",
      type: "pin",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [-6.26, 53.35],
        },
      },
      metadata: {
        label: "Test",
        createdAt: "2026-05-14T00:00:00.000Z",
      },
      status: "active",
    };

    const serialized = serializeAnnotationForFirestore(annotation);
    expect(serialized.geometryJson).toEqual(
      JSON.stringify(annotation.geometry),
    );
    expect(serialized).not.toHaveProperty("geometry");

    const restored = deserializeAnnotationFromFirestore(
      "session-1",
      "ann-1",
      serialized,
    );

    expect(restored).toEqual(annotation);
  });

  it("deserializes Firestore timestamp objects with seconds and nanoseconds", () => {
    const annotation = {
      type: "pin",
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-6.26, 53.35] },
      }),
      metadata: {
        label: "Test",
        createdAt: "2026-05-14T00:00:00.000Z",
      },
      status: "active",
      updatedAt: { seconds: 1_715_686_400, nanoseconds: 0 },
    };

    const restored = deserializeAnnotationFromFirestore(
      "session-1",
      "ann-1",
      annotation,
    );

    expect(restored.updatedAt).toBe(
      new Date(1_715_686_400 * 1000).toISOString(),
    );
  });
});
