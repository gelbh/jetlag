import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import {
  computeEliminationUnionInput,
  computeEliminationUnionInputTs,
  eliminationFeatureForAnnotationTs,
} from "./eliminationMask";

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
      color: MAP_ANNOTATION_COLORS.eliminationSoft,
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 51.45, lng: west + 0.015 },
    },
  };
}

function radarAnnotation(
  inside: boolean | undefined,
): AnnotationRecord {
  return {
    id: "radar-1",
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
      radiusMeters: 800,
      ...(inside === undefined ? {} : { inside }),
    },
  };
}

describe("adapter/eliminationMask", () => {
  it("does not shade exterior when radar inside is undefined", () => {
    expect(
      eliminationFeatureForAnnotationTs(radarAnnotation(undefined), gameArea),
    ).toBeNull();
  });

  it("yes (hider inside): eliminates outside the radar disk, not the disk", () => {
    const input = computeEliminationUnionInputTs(
      [radarAnnotation(true)],
      gameArea,
    );
    expect(input.disks).toEqual([]);
    expect(input.polygons).toHaveLength(1);
    const shade = input.polygons[0]!;
    // Center of radar must remain possible (not eliminated).
    expect(booleanPointInPolygon(turfPoint([-0.15, 51.45]), shade)).toBe(false);
    // Far corner of the play area is eliminated.
    expect(booleanPointInPolygon(turfPoint([-0.19, 51.49]), shade)).toBe(true);
  });

  it("no (hider outside): eliminates the radar disk", () => {
    const input = computeEliminationUnionInputTs(
      [radarAnnotation(false)],
      gameArea,
    );
    expect(input.polygons).toEqual([]);
    expect(input.disks).toEqual([
      { center: [51.45, -0.15], radiusMeters: 800 },
    ]);
  });

  it("maps matching annotations to polygon union input", async () => {
    const input = await computeEliminationUnionInput(
      [matchingAnnotation("a", -0.18)],
      gameArea,
      [],
    );
    expect(input.polygons).toHaveLength(1);
    expect(input.disks).toHaveLength(0);
  });

  it("snapshots kernel union input ABI for matching annotations", async () => {
    const input = await computeEliminationUnionInput(
      [matchingAnnotation("a", -0.18)],
      gameArea,
      [],
    );
    const ring = input.polygons[0]?.geometry;
    expect(ring?.type).toBe("Polygon");
    if (ring?.type !== "Polygon") {
      throw new Error("expected Polygon geometry");
    }
    expect(
      ring.coordinates[0]?.map((coord) =>
        coord.map((n) => Number(n.toFixed(5))),
      ),
    ).toEqual([
      [-0.18, 51.42],
      [-0.15, 51.42],
      [-0.15, 51.48],
      [-0.18, 51.48],
      [-0.18, 51.42],
    ]);
    expect(input.disks).toEqual([]);
  });

  it("rebuilds measuring shade from stored region input when geometry is a point", () => {
    const annotation: AnnotationRecord = {
      id: "measuring-deferred",
      sessionId: "session",
      status: "active",
      type: "measuring",
      geometry: {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      },
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        measuringAnswer: "further",
        measuringRegionInputJson: JSON.stringify({
          measuringSubject: "location",
          measuringLocationCategory: "museum",
          measuringDistanceMeters: 1000,
          measuringTargetPoint: [51.44, -0.14],
          measuringPlaces: [],
          measuringCoastSegments: [],
          measuringSeaLevelNearRegion: null,
          usesAllPlacesInArea: false,
        }),
      },
    };

    const shade = eliminationFeatureForAnnotationTs(annotation, gameArea);
    expect(shade?.geometry.type).toMatch(/Polygon/);
    expect(
      booleanPointInPolygon(turfPoint([-0.14, 51.44]), shade!),
    ).toBe(true);
  });
});
