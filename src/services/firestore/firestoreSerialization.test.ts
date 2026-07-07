import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../domain/annotations";
import {
  assertNoNestedArrays,
  buildHidingZoneDocument,
  buildSessionDocument,
  deserializeAnnotationFromFirestore,
  deserializeGameAreaFromFirestore,
  deserializeSessionFromFirestore,
  serializeAnnotationForFirestore,
  serializeGameAreaForFirestore,
} from "./firestoreSerialization";

const sampleGameArea = {
  type: "Polygon" as const,
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

describe("firestoreSerialization", () => {
  it("stores game areas with bounds and geometry json", () => {
    const serialized = serializeGameAreaForFirestore(sampleGameArea);

    expect(serialized).toEqual({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
      geometryJson: JSON.stringify(sampleGameArea),
    });
    expect(serialized).not.toHaveProperty("coordinates");
  });

  it("reconstructs game areas from stored geometry json", () => {
    const restored = deserializeGameAreaFromFirestore({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
      geometryJson: JSON.stringify(sampleGameArea),
    });

    expect(restored).toEqual(sampleGameArea);
  });

  it("falls back to stored bounds when geometry json is missing", () => {
    const restored = deserializeGameAreaFromFirestore({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
    });

    expect(restored.type).toBe("Polygon");
    expect(restored.coordinates[0][0]).toEqual([-6.3, 53.3]);
    expect(restored.coordinates[0]).toHaveLength(5);
  });

  it("builds a Firestore-safe session document", () => {
    const payload = buildSessionDocument(
      "ABCD",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "dublin",
    );

    expect(() => assertNoNestedArrays(payload)).not.toThrow();
    expect(payload.gameArea).not.toHaveProperty("coordinates");
    expect(payload.memberUids).toEqual(["host-uid"]);
    expect(payload.status).toBe("active");
    expect(payload.tier).toBe("free");
  });

  it("stores premium tier on session documents", () => {
    const payload = buildSessionDocument(
      "ABCD",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "premium",
    );

    expect(payload.tier).toBe("premium");
  });

  it("deserializes session tier with free default", () => {
    const session = deserializeSessionFromFirestore("session-1", {
      code: "ABCD",
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      status: "active",
    });

    expect(session.tier).toBe("free");
  });

  it("deserializes ended sessions without a code field", () => {
    const session = deserializeSessionFromFirestore("session-ended", {
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      endedAt: "2026-05-15T00:00:00.000Z",
      status: "ended",
    });

    expect(session.code).toBe("");
    expect(session.status).toBe("ended");
  });

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

  it("omits undefined hiding zone fields from Firestore payloads", () => {
    const payload = buildHidingZoneDocument({
      hiderUid: "hider-1",
      sessionId: "session-1",
      stationId: "station-1",
      stationName: "Test Station",
      center: { lat: 53.35, lng: -6.26 },
      radiusMeters: 400,
      geometryJson: '{"type":"Polygon","coordinates":[]}',
      status: "confirmed",
      confirmedAt: "2026-05-14T00:00:00.000Z",
    });

    expect(payload).not.toHaveProperty("originalStation");
    expect(payload).not.toHaveProperty("previousStations");
    expect(payload).not.toHaveProperty("moveInProgress");
    expect(() => assertNoNestedArrays(payload)).not.toThrow();
  });
});
