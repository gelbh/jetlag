import { describe, expect, it } from "vitest";
import { destinationPoint } from "../../geometry/core/geodesicPrimitives";
import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import type { AnnotationRecord } from "../../map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import {
  answeredRadarCircle,
  isNearRadarEliminationEdge,
  NEAR_RADAR_EDGE_METERS,
} from "./nearRadarEliminationEdge";

const RADAR_CENTER: LatLngTuple = [51.45, -0.15];
const RADIUS_METERS = 2000;

function radarAnnotation(options: {
  id?: string;
  inside?: boolean;
  status?: AnnotationRecord["status"];
  radiusMeters?: number;
  center?: LatLngTuple;
}): AnnotationRecord {
  const center = options.center ?? RADAR_CENTER;
  return {
    id: options.id ?? "radar-1",
    sessionId: "session",
    status: options.status ?? "active",
    type: "radar",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [center[1], center[0]],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      radiusMeters: options.radiusMeters ?? RADIUS_METERS,
      ...(typeof options.inside === "boolean" ? { inside: options.inside } : {}),
    },
  };
}

function pointAlongRadius(distanceMeters: number): LatLngTuple {
  return destinationPoint(RADAR_CENTER, distanceMeters, 0);
}

describe("answeredRadarCircle", () => {
  it("returns centre, radius, and inside for an answered radar", () => {
    const circle = answeredRadarCircle(radarAnnotation({ inside: true, radiusMeters: 1500 }));
    expect(circle).toEqual({
      center: RADAR_CENTER,
      radiusMeters: 1500,
      inside: true,
    });
  });

  it("uses pointToolRadiusFromMetadata default when radiusMeters is missing", () => {
    const annotation = radarAnnotation({ inside: false });
    delete annotation.metadata.radiusMeters;
    const circle = answeredRadarCircle(annotation);
    expect(circle?.radiusMeters).toBe(DEFAULT_RADIUS_METERS);
  });

  it("returns null when inside is unanswered", () => {
    expect(answeredRadarCircle(radarAnnotation({}))).toBeNull();
  });
});

describe("isNearRadarEliminationEdge", () => {
  it("is true when the point sits exactly on the radar edge", () => {
    const point = pointAlongRadius(RADIUS_METERS);
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({ inside: true })])).toBe(true);
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({ inside: false })])).toBe(true);
  });

  it("is true within 50 m inside the circumference", () => {
    const point = pointAlongRadius(RADIUS_METERS - NEAR_RADAR_EDGE_METERS);
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({ inside: true })])).toBe(true);
  });

  it("is true within 50 m outside the circumference", () => {
    // Stay slightly inside the threshold so geodesic round-trip noise cannot push past 50 m.
    const point = pointAlongRadius(RADIUS_METERS + (NEAR_RADAR_EDGE_METERS - 1));
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({ inside: false })])).toBe(true);
  });

  it("is false at 51 m from the edge", () => {
    const point = pointAlongRadius(RADIUS_METERS - (NEAR_RADAR_EDGE_METERS + 1));
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({ inside: true })])).toBe(false);
  });

  it("skips inactive radars", () => {
    const point = pointAlongRadius(RADIUS_METERS);
    expect(
      isNearRadarEliminationEdge(point, [radarAnnotation({ inside: true, status: "deleted" })]),
    ).toBe(false);
  });

  it("skips unanswered radars (inside missing)", () => {
    const point = pointAlongRadius(RADIUS_METERS);
    expect(isNearRadarEliminationEdge(point, [radarAnnotation({})])).toBe(false);
  });

  it("returns true when any answered radar is near the edge", () => {
    const point = pointAlongRadius(RADIUS_METERS - 10);
    const farRadar = radarAnnotation({
      id: "far",
      inside: true,
      center: destinationPoint(RADAR_CENTER, 50_000, 90),
    });
    expect(
      isNearRadarEliminationEdge(point, [farRadar, radarAnnotation({ id: "near", inside: true })]),
    ).toBe(true);
  });
});
