import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { milesToMeters } from "../../map/distance";
import { serializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import {
  matchingAnswerFromReplyId,
  resolveMatchingPendingQuestion,
} from "./matching";
import {
  measuringAnswerFromReplyId,
  resolveMeasuringPendingQuestion,
} from "./measuring";
import * as measuringGeometryBudgets from "../../geometry/measuring/measuringGeometryBudgets";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "../../geometry/measuring/measuringGeometryBudgets";
import {
  isPhotoPendingQuestion,
  photoPendingQuestionAnswered,
} from "./photo";
import {
  radarAnswerFromReplyId,
  resolveRadarPendingQuestion,
} from "./radar";
import {
  resolveTentaclePendingQuestion,
  tentacleAnswerFromReplyId,
} from "./tentacle";
import {
  resolveThermometerPendingQuestion,
  thermometerAnswerFromReplyId,
} from "./thermometer";
import exysHospitalTentacle from "../../geometry/tentacle/fixtures/exysHospitalTentacle.json";
import { TENTACLE_POI_MAX } from "../../geometry/tentacle/tentacleGeometryBudgets";
import type { TentaclePoi } from "../../map/annotations";

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

function basePending(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: "",
      metadata: {},
    },
    replyOptions: [],
    promptText: "Test question",
    ...overrides,
  };
}

describe("questionResolution reply parsers", () => {
  it("parses matching and measuring replies", () => {
    expect(matchingAnswerFromReplyId("yes")).toBe("yes");
    expect(matchingAnswerFromReplyId("invalid")).toBeNull();
    expect(measuringAnswerFromReplyId("closer")).toBe("closer");
    expect(measuringAnswerFromReplyId("further")).toBe("further");
    expect(measuringAnswerFromReplyId("same")).toBeNull();
  });

  it("parses radar and thermometer replies", () => {
    expect(radarAnswerFromReplyId("no")).toBe("no");
    expect(radarAnswerFromReplyId("maybe")).toBeNull();
    expect(thermometerAnswerFromReplyId("hotter")).toBe("hotter");
    expect(thermometerAnswerFromReplyId("colder")).toBe("colder");
  });

  it("passes through tentacle reply ids", () => {
    expect(tentacleAnswerFromReplyId("poi-west")).toBe("poi-west");
    expect(tentacleAnswerFromReplyId("out-of-reach")).toBe("out-of-reach");
  });
});

describe("resolveRadarPendingQuestion", () => {
  it("marks inside when hider answered yes", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusMeters: milesToMeters(1) },
      },
    });

    const resolved = resolveRadarPendingQuestion(pending, "yes");

    expect(resolved.type).toBe("radar");
    expect(resolved.metadata.inside).toBe(true);
    expect(resolved.metadata.color).toBe(MAP_ANNOTATION_COLORS.radar);
  });

  it("marks outside when hider answered no", () => {
    const pending = basePending({
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusMeters: milesToMeters(1) },
      },
    });

    const resolved = resolveRadarPendingQuestion(pending, "no");
    expect(resolved.metadata.inside).toBe(false);
  });
});

describe("resolveThermometerPendingQuestion", () => {
  it("records hotter/colder on the annotation metadata", () => {
    const pending = basePending({
      toolType: "thermometer",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.16, 51.44],
              [-0.14, 51.46],
            ],
          },
        }),
        metadata: { thermometerDistanceMeters: milesToMeters(0.5) },
      },
    });

    const hotter = resolveThermometerPendingQuestion(pending, "hotter");
    expect(hotter.metadata.hotterTowards).toBe("b");
    expect(hotter.metadata.thermometerAnswer).toBe("hotter");

    const colder = resolveThermometerPendingQuestion(pending, "colder");
    expect(colder.metadata.hotterTowards).toBe("a");
  });
});

describe("resolveMatchingPendingQuestion", () => {
  it("returns null when matching metadata is incomplete", async () => {
    await expect(
      resolveMatchingPendingQuestion(
        basePending({ toolType: "matching" }),
        "yes",
        gameArea,
      ),
    ).resolves.toBeNull();
  });

  it("builds elimination geometry for a yes answer", async () => {
    const features = serializeMatchingFeatures([
      {
        id: "museum-a",
        name: "Near Museum",
        point: [51.45, -0.16],
        inPlayArea: true,
      },
      {
        id: "museum-b",
        name: "Far Museum",
        point: [51.42, -0.19],
        inPlayArea: true,
      },
    ]);

    const pending = basePending({
      toolType: "matching",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          matchingFeaturesJson: features,
          matchingNearestFeatureId: "museum-a",
        },
      },
    });

    const resolved = await resolveMatchingPendingQuestion(
      pending,
      "yes",
      gameArea,
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.type).toBe("matching");
    expect(resolved?.metadata.matchingAnswer).toBe("yes");
    expect(resolved?.metadata.matchingBoundaryJson).toBeTruthy();
    expect(resolved?.metadata.color).toBe(MAP_ANNOTATION_COLORS.elimination);
  });

  it("stores answer on null-answer matching questions without boundary geometry", async () => {
    const pending = basePending({
      toolType: "matching",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          matchingNullAnswer: true,
          matchingFeaturesJson: "[]",
          matchingNearestFeatureId: "missing",
        },
      },
    });

    const resolved = await resolveMatchingPendingQuestion(
      pending,
      "no",
      gameArea,
    );

    expect(resolved?.metadata.matchingAnswer).toBe("no");
    expect(resolved?.metadata.matchingBoundaryJson).toBeUndefined();
  });
});

describe("resolveMeasuringPendingQuestion", () => {
  it("returns null without region input metadata", async () => {
    await expect(
      resolveMeasuringPendingQuestion(
        basePending({ toolType: "measuring" }),
        "closer",
        gameArea,
      ),
    ).resolves.toBeNull();
  });

  it("builds measuring elimination from stored region input", async () => {
    const pending = basePending({
      toolType: "measuring",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          measuringRegionInputJson: JSON.stringify({
            gameArea,
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
      },
    });

    const resolved = await resolveMeasuringPendingQuestion(
      pending,
      "further",
      gameArea,
    );

    expect(resolved?.type).toBe("measuring");
    expect(resolved?.metadata.measuringAnswer).toBe("further");
    expect(resolved?.metadata.measuringBoundaryJson).toBeUndefined();
  });

  it("builds measuring elim when region JSON omits gameArea", async () => {
    const pending = basePending({
      toolType: "measuring",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
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
      },
    });

    const resolved = await resolveMeasuringPendingQuestion(
      pending,
      "further",
      gameArea,
    );

    expect(resolved?.type).toBe("measuring");
    expect(resolved?.metadata.measuringBoundaryJson).toBeUndefined();
  });

  it("hydrates all-places measuring from measuringPlacesJson", async () => {
    const pending = basePending({
      toolType: "measuring",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          measuringPlacesJson: JSON.stringify([
            { id: "a", name: "West", lat: 51.45, lng: -0.18 },
            { id: "b", name: "East", lat: 51.45, lng: -0.12 },
          ]),
          measuringRegionInputJson: JSON.stringify({
            measuringSubject: "location",
            measuringLocationCategory: "airport",
            measuringDistanceMeters: 2500,
            measuringTargetPoint: null,
            measuringPlaces: [],
            measuringCoastSegments: [],
            measuringSeaLevelNearRegion: null,
            usesAllPlacesInArea: true,
          }),
        },
      },
    });

    const resolved = await resolveMeasuringPendingQuestion(
      pending,
      "further",
      gameArea,
    );

    expect(resolved?.type).toBe("measuring");
    expect(resolved?.metadata.measuringBoundaryJson).toBeUndefined();
  });

  it("returns null when elim stays over persist slim ceiling", async () => {
    const softenSpy = vi
      .spyOn(measuringGeometryBudgets, "persistSlimMeasuringGeometry")
      .mockReturnValue({
        ok: false,
        message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
      });

    const pending = basePending({
      toolType: "measuring",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
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
      },
    });

    await expect(
      resolveMeasuringPendingQuestion(pending, "further", gameArea),
    ).resolves.toBeNull();

    softenSpy.mockRestore();
  });
});

describe("resolveTentaclePendingQuestion", () => {
  it("returns null when poi metadata is missing", async () => {
    expect(
      await resolveTentaclePendingQuestion(
        basePending({ toolType: "tentacle" }),
        "poi-1",
        gameArea,
      ),
    ).toBeNull();
  });

  it("marks out-of-reach answers without a highlighted poi", async () => {
    const pending = basePending({
      toolType: "tentacle",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          poisJson: JSON.stringify([
            {
              id: "poi-west",
              name: "West Museum",
              lat: 51.45,
              lng: -0.18,
              category: "museum",
            },
          ]),
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
        },
      },
    });

    const resolved = await resolveTentaclePendingQuestion(
      pending,
      "out-of-reach",
      gameArea,
    );

    expect(resolved?.metadata.tentacleOutOfReach).toBe(true);
    expect(resolved?.metadata.highlightedPoiId).toBeUndefined();
    expect(resolved?.metadata.tentacleAnswerRadiusMeters).toBeUndefined();
  });

  it("highlights the answered poi", async () => {
    const pending = basePending({
      toolType: "tentacle",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          poisJson: JSON.stringify([
            {
              id: "poi-west",
              name: "West Museum",
              lat: 51.45,
              lng: -0.18,
              category: "museum",
            },
          ]),
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
        },
      },
    });

    const resolved = await resolveTentaclePendingQuestion(
      pending,
      "poi-west",
      gameArea,
    );

    expect(resolved?.metadata.tentacleOutOfReach).toBe(false);
    expect(resolved?.metadata.highlightedPoiId).toBe("poi-west");
    expect(resolved?.metadata.tentacleAnswerPoiName).toBe("West Museum");
  });

  it("stores radius from pending metadata", async () => {
    const largeRadius = milesToMeters(15);
    const pending = basePending({
      toolType: "tentacle",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          radiusMeters: largeRadius,
          poisJson: JSON.stringify([
            {
              id: "poi-west",
              name: "West Museum",
              lat: 51.45,
              lng: -0.18,
              category: "museum",
            },
            {
              id: "poi-east",
              name: "East Museum",
              lat: 51.45,
              lng: -0.12,
              category: "museum",
            },
          ]),
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
        },
      },
    });

    const resolved = await resolveTentaclePendingQuestion(
      pending,
      "poi-west",
      gameArea,
    );

    expect(resolved?.metadata.radiusMeters).toBe(largeRadius);
    expect(resolved?.metadata.tentacleAnswerRadiusMeters).toBe(largeRadius);
  });

  it("EXYS hospital tentacle resolves annotation with elim shade (not stuck answered)", async () => {
    // Live: EXYS / a4ad8efe-90d3-46cb-a803-b37ef2e307e2 answered Q7989290, no annotation.
    const dublinGameArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-6.4, 53.2],
          [-6.1, 53.2],
          [-6.1, 53.5],
          [-6.4, 53.5],
          [-6.4, 53.2],
        ],
      ],
    };
    const pending = basePending({
      id: exysHospitalTentacle.pendingQuestionId,
      toolType: "tentacle",
      status: "answered",
      answer: exysHospitalTentacle.answerPoiId,
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [
              exysHospitalTentacle.center.lng,
              exysHospitalTentacle.center.lat,
            ],
          },
        }),
        metadata: {
          radiusMeters: exysHospitalTentacle.radiusMeters,
          poisJson: JSON.stringify(exysHospitalTentacle.pois),
          centerJson: JSON.stringify(exysHospitalTentacle.center),
          tentacleCategoryId: "hospital",
        },
      },
    });

    const resolved = await resolveTentaclePendingQuestion(
      pending,
      exysHospitalTentacle.answerPoiId,
      dublinGameArea,
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.metadata.highlightedPoiId).toBe(
      exysHospitalTentacle.answerPoiId,
    );
    expect(resolved?.metadata.tentacleEliminationJson).toBeTruthy();
    expect(
      JSON.parse(resolved!.metadata.tentacleEliminationJson as string),
    ).toMatchObject({
      geometry: { type: expect.stringMatching(/Polygon|MultiPolygon/) },
    });
  });

  it("returns elim JSON for POI lists above the former 64 cap", async () => {
    const overBudget: TentaclePoi[] = Array.from(
      { length: TENTACLE_POI_MAX + 1 },
      (_, index) => ({
        id: `poi-${index}`,
        name: `POI ${index}`,
        lat: 51.45,
        lng: -0.15 + index * 0.0001,
        category: "museum",
      }),
    );
    const pending = basePending({
      toolType: "tentacle",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: {
          poisJson: JSON.stringify(overBudget),
          centerJson: JSON.stringify({ lat: 51.45, lng: -0.15 }),
        },
      },
    });

    await expect(
      resolveTentaclePendingQuestion(pending, "poi-0", gameArea),
    ).resolves.not.toBeNull();
  });
});

describe("photo pending question helpers", () => {
  it("detects photo pending questions and answered state", () => {
    const photo = basePending({ toolType: "photo" });
    expect(isPhotoPendingQuestion(photo)).toBe(true);
    expect(isPhotoPendingQuestion(undefined)).toBe(false);
    expect(isPhotoPendingQuestion(basePending())).toBe(false);

    expect(photoPendingQuestionAnswered({ ...photo, status: "pending" })).toBe(
      false,
    );
    expect(photoPendingQuestionAnswered({ ...photo, status: "answered" })).toBe(
      true,
    );
    expect(photoPendingQuestionAnswered({ ...photo, status: "resolved" })).toBe(
      true,
    );
  });
});
