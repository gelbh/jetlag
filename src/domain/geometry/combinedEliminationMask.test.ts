import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";
import {
  buildCombinedEliminationMask,
  buildEndGameEliminationMask,
  eliminationFeatureForAnnotation,
} from "./combinedEliminationMask";
import { unionEliminationPartsLegacy } from "./unionPolygonFeatures";

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

describe("combinedEliminationMask parity", () => {
  it("matches legacy union for mixed committed annotations", () => {
    const annotations = [
      matchingAnnotation("a", -0.19),
      matchingAnnotation("b", -0.16),
      matchingAnnotation("c", -0.13),
    ];

    const candidate = buildCombinedEliminationMask(annotations, gameArea);
    const baseline = unionEliminationPartsLegacy({
      polygons: annotations.map(
        (annotation) => eliminationFeatureForAnnotation(annotation, gameArea)!,
      ),
      disks: [],
    });

    expect(candidate).not.toBeNull();
    expect(baseline).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), candidate!),
    ).toBe(booleanPointInPolygon(turfPoint([-0.185, 51.45]), baseline!));
    expect(
      booleanPointInPolygon(turfPoint([-0.155, 51.45]), candidate!),
    ).toBe(booleanPointInPolygon(turfPoint([-0.155, 51.45]), baseline!));
  });
});

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

  it("adds a new elimination region to an existing mask", () => {
    const first = buildCombinedEliminationMask(
      [matchingAnnotation("a", -0.19)],
      gameArea,
    );
    const combined = buildCombinedEliminationMask(
      [matchingAnnotation("a", -0.19), matchingAnnotation("b", -0.16)],
      gameArea,
    );

    expect(first).not.toBeNull();
    expect(combined).not.toBeNull();
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

  it("does not throw when union receives an invalid draft polygon", () => {
    const invalidDraft = eliminationFeatureForAnnotation(
      matchingAnnotation("draft", -0.12),
      gameArea,
    );
    expect(invalidDraft).not.toBeNull();

    const invalidGeometry = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.15, 51.45],
            [-0.12, 51.48],
            [-0.18, 51.48],
            [-0.12, 51.42],
            [-0.15, 51.45],
          ],
        ],
      },
    } as unknown as NonNullable<Parameters<typeof buildCombinedEliminationMask>[2]>[number];

    expect(() =>
      buildCombinedEliminationMask(
        [matchingAnnotation("a", -0.19)],
        gameArea,
        [invalidGeometry],
      ),
    ).not.toThrow();
  });

  it("replaces elimination with end-game zone reveal mask", () => {
    const hidingZone: HidingZoneRecord = {
      hiderUid: "hider-1",
      sessionId: "session",
      stationId: "station-1",
      stationName: "Station",
      center: { lat: 51.45, lng: -0.15 },
      radiusMeters: 400,
      geometryJson: "{}",
      status: "confirmed",
      confirmedAt: "2026-01-01T00:00:00.000Z",
    };

    const endGameMask = buildEndGameEliminationMask(gameArea, [hidingZone]);
    expect(endGameMask).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.15, 51.45]), endGameMask!),
    ).toBe(false);
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), endGameMask!),
    ).toBe(true);
  });

  it("uses end-game mask when hiding zones are provided to buildCombinedEliminationMask", () => {
    const hidingZone: HidingZoneRecord = {
      hiderUid: "hider-1",
      sessionId: "session",
      stationId: "station-1",
      stationName: "Station",
      center: { lat: 51.45, lng: -0.15 },
      radiusMeters: 400,
      geometryJson: "{}",
      status: "confirmed",
      confirmedAt: "2026-01-01T00:00:00.000Z",
    };

    const combined = buildCombinedEliminationMask(
      [matchingAnnotation("a", -0.19)],
      gameArea,
      [],
      [hidingZone],
    );

    expect(combined).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.15, 51.45]), combined!),
    ).toBe(false);
  });

  it("clips elimination shading to the play area boundary", () => {
    const outsideWest: AnnotationRecord = {
      ...matchingAnnotation("outside", -0.19),
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-0.25, 51.42],
              [-0.05, 51.42],
              [-0.05, 51.48],
              [-0.25, 51.48],
              [-0.25, 51.42],
            ],
          ],
        },
      },
    };

    const combined = buildCombinedEliminationMask([outsideWest], gameArea);

    expect(combined).not.toBeNull();
    expect(
      booleanPointInPolygon(turfPoint([-0.21, 51.45]), combined!),
    ).toBe(false);
    expect(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!),
    ).toBe(true);
  });
});
