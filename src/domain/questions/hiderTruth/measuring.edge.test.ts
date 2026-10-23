import { describe, expect, it } from "vitest";
import { destinationPoint } from "../../geometry/core/geodesicPrimitives";
import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { isNearMeasuringEliminationEdge, measuringFlipGapMetersAtPoint } from "./measuring";
import { NEAR_ELIMINATION_EDGE_METERS } from "./nearRadarEliminationEdge";

const TARGET: LatLngTuple = [51.45, -0.15];
const SEEKER = destinationPoint(TARGET, 2000, 0);

const coastGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.1, 53.3],
      [-6.1, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
};

function measuringAnnotation(options: {
  answer?: "closer" | "further";
  region: Record<string, unknown>;
  seeker?: LatLngTuple;
}): AnnotationRecord {
  const seeker = options.seeker ?? SEEKER;
  return {
    id: "measuring-1",
    sessionId: "session",
    status: "active",
    type: "measuring",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [seeker[1], seeker[0]],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      measuringAnchor: { lat: seeker[0], lng: seeker[1] },
      measuringRegionInputJson: JSON.stringify(options.region),
      ...(options.answer ? { measuringAnswer: options.answer } : {}),
    },
  };
}

describe("isNearMeasuringEliminationEdge", () => {
  it("is true on the point-target circumference with session-independent geometry", () => {
    const onEdge = destinationPoint(TARGET, 2000, 90);
    const annotation = measuringAnnotation({
      answer: "closer",
      region: {
        measuringSubject: "location",
        measuringLocationCategory: "museum",
        measuringDistanceMeters: 2000,
        measuringTargetPoint: TARGET,
        measuringPlaces: [],
        measuringCoastSegments: [],
        measuringSeaLevelNearRegion: null,
        usesAllPlacesInArea: false,
      },
    });
    expect(isNearMeasuringEliminationEdge(onEdge, [annotation])).toBe(true);
  });

  it("needs session gameArea for coastline pin when region JSON omits gameArea", () => {
    const coastSegment = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-6.3, 53.35],
          [-6.2, 53.35],
        ],
      },
    };
    const equidistant: LatLngTuple = [53.36, -6.25];
    const annotation = measuringAnnotation({
      answer: "closer",
      seeker: equidistant,
      region: {
        measuringSubject: "coastline",
        measuringDistanceMeters: 4567,
        measuringTargetPoint: null,
        measuringPlaces: [],
        measuringCoastSegments: [coastSegment],
        measuringSeaLevelNearRegion: null,
        usesAllPlacesInArea: false,
      },
    });

    expect(measuringFlipGapMetersAtPoint(equidistant, annotation)).toBeNull();
    expect(isNearMeasuringEliminationEdge(equidistant, [annotation])).toBe(false);

    const gap = measuringFlipGapMetersAtPoint(equidistant, annotation, coastGameArea);
    expect(gap).not.toBeNull();
    expect(gap!).toBeLessThanOrEqual(NEAR_ELIMINATION_EDGE_METERS);
    expect(
      isNearMeasuringEliminationEdge(equidistant, [annotation], undefined, coastGameArea),
    ).toBe(true);
  });

  it("skips unanswered measuring", () => {
    const onEdge = destinationPoint(TARGET, 2000, 90);
    const annotation = measuringAnnotation({
      region: {
        measuringSubject: "location",
        measuringLocationCategory: "museum",
        measuringDistanceMeters: 2000,
        measuringTargetPoint: TARGET,
        measuringPlaces: [],
        measuringCoastSegments: [],
        measuringSeaLevelNearRegion: null,
        usesAllPlacesInArea: false,
      },
    });
    expect(isNearMeasuringEliminationEdge(onEdge, [annotation])).toBe(false);
  });
});
