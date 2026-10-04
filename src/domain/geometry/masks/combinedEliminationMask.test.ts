import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { HidingZoneRecord } from "../../session/hiding/hidingZone";
import {
  annotationsToEndGameDisks,
  computeEliminationUnionInputTs,
  eliminationFeatureForAnnotationTs,
} from "../adapter/eliminationMask";
import { gameAreaToFeature } from "../core/gameAreaConvert";
import { featureToGameAreaGeometry } from "../kernel/featureConvert";
import { runEndGameMaskFromDisks, runMaskFromUnionInput } from "../kernel/maskKernelRunner";
import { unionEliminationParts } from "../kernel/unionPolygonFeatures";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

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
      color: "#ef4444",
      matchingCategory: "commercial_airport",
      matchingAnswer: "no",
      matchingAnchor: { lat: 51.45, lng: west + 0.015 },
    },
  };
}

async function buildCombinedMask(
  annotations: readonly AnnotationRecord[],
  area: GameArea,
  draftFeatures: readonly import("../kernel/types").PolygonFeature[] = [],
  endGameHidingZones: readonly HidingZoneRecord[] = [],
) {
  const geometry = featureToGameAreaGeometry(gameAreaToFeature(area));
  if (endGameHidingZones.length > 0) {
    return runEndGameMaskFromDisks(geometry, annotationsToEndGameDisks(endGameHidingZones));
  }
  return runMaskFromUnionInput(
    computeEliminationUnionInputTs(annotations, area, draftFeatures),
    geometry,
  );
}

describe.skipIf(!wasmPkgReady)("combinedEliminationMask parity", () => {
  it("matches turf engine union for mixed committed annotations", async () => {
    const annotations = [
      matchingAnnotation("a", -0.19),
      matchingAnnotation("b", -0.16),
      matchingAnnotation("c", -0.13),
    ];

    const candidate = await buildCombinedMask(annotations, gameArea);
    const baseline = unionEliminationParts(
      {
        polygons: annotations.map((annotation) => eliminationFeatureForAnnotationTs(annotation)!),
        disks: [],
      },
      "turf",
    );

    expect(candidate).not.toBeNull();
    expect(baseline).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.185, 51.45]), candidate!)).toBe(
      booleanPointInPolygon(turfPoint([-0.185, 51.45]), baseline!),
    );
    expect(booleanPointInPolygon(turfPoint([-0.155, 51.45]), candidate!)).toBe(
      booleanPointInPolygon(turfPoint([-0.155, 51.45]), baseline!),
    );
  });

  it("incremental prior union new matches full rebuild on point-in-polygon samples", async () => {
    const priorAnnotations = [matchingAnnotation("a", -0.19), matchingAnnotation("b", -0.16)];
    const next = matchingAnnotation("c", -0.13);
    const all = [...priorAnnotations, next];

    const priorMask = await buildCombinedMask(priorAnnotations, gameArea);
    const fullRebuild = await buildCombinedMask(all, gameArea);
    expect(priorMask).not.toBeNull();
    expect(fullRebuild).not.toBeNull();

    const newInput = computeEliminationUnionInputTs([next], gameArea, []);
    const geometry = featureToGameAreaGeometry(gameAreaToFeature(gameArea));
    const incremental = await runMaskFromUnionInput(
      {
        polygons: [priorMask!, ...newInput.polygons],
        disks: newInput.disks,
      },
      geometry,
    );

    expect(incremental).not.toBeNull();
    const samples: [number, number][] = [
      [-0.185, 51.45],
      [-0.155, 51.45],
      [-0.125, 51.45],
      [-0.11, 51.45],
      [-0.15, 51.41],
    ];
    for (const [lng, lat] of samples) {
      const sample = turfPoint([lng, lat]);
      expect(booleanPointInPolygon(sample, incremental!)).toBe(
        booleanPointInPolygon(sample, fullRebuild!),
      );
    }
  });
});

describe.skipIf(!wasmPkgReady)("combinedEliminationMask", () => {
  it("merges multiple elimination regions into one mask", async () => {
    const combined = await buildCombinedMask(
      [matchingAnnotation("a", -0.19), matchingAnnotation("b", -0.16)],
      gameArea,
    );

    expect(combined).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!)).toBe(true);
    expect(booleanPointInPolygon(turfPoint([-0.155, 51.45]), combined!)).toBe(true);
  });

  it("adds a new elimination region to an existing mask", async () => {
    const first = await buildCombinedMask([matchingAnnotation("a", -0.19)], gameArea);
    const combined = await buildCombinedMask(
      [matchingAnnotation("a", -0.19), matchingAnnotation("b", -0.16)],
      gameArea,
    );

    expect(first).not.toBeNull();
    expect(combined).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.155, 51.45]), combined!)).toBe(true);
  });

  it("includes draft preview features with committed eliminations", async () => {
    const draft = eliminationFeatureForAnnotationTs(matchingAnnotation("draft", -0.12));

    expect(draft).not.toBeNull();

    const combined = await buildCombinedMask(
      [matchingAnnotation("a", -0.19)],
      gameArea,
      draft ? [draft] : [],
    );

    expect(combined).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!)).toBe(true);
    expect(booleanPointInPolygon(turfPoint([-0.115, 51.45]), combined!)).toBe(true);
  });

  it("does not throw when union receives an invalid draft polygon", async () => {
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
    } as import("../kernel/types").PolygonFeature;

    await expect(
      buildCombinedMask([matchingAnnotation("a", -0.19)], gameArea, [invalidGeometry]),
    ).resolves.not.toThrow();
  });

  it("replaces elimination with end-game zone reveal mask", async () => {
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

    const endGameMask = await buildCombinedMask([], gameArea, [], [hidingZone]);
    expect(endGameMask).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.15, 51.45]), endGameMask!)).toBe(false);
    expect(booleanPointInPolygon(turfPoint([-0.185, 51.45]), endGameMask!)).toBe(true);
  });

  it("uses end-game mask when hiding zones are provided", async () => {
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

    const combined = await buildCombinedMask(
      [matchingAnnotation("a", -0.19)],
      gameArea,
      [],
      [hidingZone],
    );

    expect(combined).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.15, 51.45]), combined!)).toBe(false);
  });

  it("clips elimination shading to the play area boundary", async () => {
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

    const combined = await buildCombinedMask([outsideWest], gameArea);

    expect(combined).not.toBeNull();
    expect(booleanPointInPolygon(turfPoint([-0.21, 51.45]), combined!)).toBe(false);
    expect(booleanPointInPolygon(turfPoint([-0.185, 51.45]), combined!)).toBe(true);
  });

  it("returns null when elimination geometry is entirely outside the play area", async () => {
    const outsideEast: AnnotationRecord = {
      ...matchingAnnotation("outside-east", -0.19),
      geometry: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0.05, 51.42],
              [0.15, 51.42],
              [0.15, 51.48],
              [0.05, 51.48],
              [0.05, 51.42],
            ],
          ],
        },
      },
    };

    expect(await buildCombinedMask([outsideEast], gameArea)).toBeNull();
  });
});
