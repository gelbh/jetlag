import { describe, expect, it } from "vitest";
import {
  migrateAnnotationRecord,
  migrateAnnotations,
  type AnnotationRecord,
} from "./annotations";

const baseAnnotation = {
  id: "ann-1",
  sessionId: "local",
  status: "active" as const,
  geometry: {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
  },
  metadata: {
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("annotation migration", () => {
  it("moves legacy measuring records off thermometer", () => {
    const legacy: AnnotationRecord = {
      ...baseAnnotation,
      type: "thermometer",
      metadata: {
        ...baseAnnotation.metadata,
        measuringSubject: "coastline",
        measuringAnswer: "closer",
      },
    };

    expect(migrateAnnotationRecord(legacy)).toEqual({
      ...legacy,
      type: "measuring",
    });
  });

  it("leaves classic thermometer records unchanged", () => {
    const thermometer: AnnotationRecord = {
      ...baseAnnotation,
      type: "thermometer",
      metadata: {
        ...baseAnnotation.metadata,
        thermometerDistanceMeters: 804.672,
        thermometerAnswer: "hotter",
      },
    };

    expect(migrateAnnotationRecord(thermometer)).toEqual(thermometer);
  });

  it("migrates annotation batches", () => {
    const migrated = migrateAnnotations([
      {
        ...baseAnnotation,
        id: "legacy",
        type: "thermometer",
        metadata: {
          ...baseAnnotation.metadata,
          measuringSubject: "location",
        },
      },
      {
        ...baseAnnotation,
        id: "thermo",
        type: "thermometer",
        metadata: {
          ...baseAnnotation.metadata,
          thermometerDistanceMeters: 804.672,
        },
      },
    ]);

    expect(migrated.map((annotation) => annotation.type)).toEqual([
      "measuring",
      "thermometer",
    ]);
  });
});
