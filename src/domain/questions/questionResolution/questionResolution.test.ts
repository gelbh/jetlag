import { describe, expect, it } from "vitest";
import type { GameArea } from "../../map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { milesToMeters } from "../../map/distance";
import { serializeMatchingFeatures } from "../../../services/geo/matchingFeatures";
import {
  matchingAnswerFromReplyId,
  resolveMatchingPendingQuestion,
} from "./matching";
import {
  measuringAnswerFromReplyId,
  resolveMeasuringPendingQuestion,
} from "./measuring";
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
    expect(resolved.metadata.inside).toBe(false);
    expect(resolved.metadata.color).toBe(MAP_ANNOTATION_COLORS.radar);
  });

  it("marks inside when hider answered no", () => {
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
    expect(resolved.metadata.inside).toBe(true);
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
  it("returns null when matching metadata is incomplete", () => {
    expect(
      resolveMatchingPendingQuestion(
        basePending({ toolType: "matching" }),
        "yes",
        gameArea,
      ),
    ).toBeNull();
  });

  it("builds elimination geometry for a yes answer", () => {
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

    const resolved = resolveMatchingPendingQuestion(pending, "yes", gameArea);

    expect(resolved).not.toBeNull();
    expect(resolved?.type).toBe("matching");
    expect(resolved?.metadata.matchingAnswer).toBe("yes");
    expect(resolved?.metadata.matchingBoundaryJson).toBeTruthy();
    expect(resolved?.metadata.color).toBe(MAP_ANNOTATION_COLORS.elimination);
  });

  it("stores answer on null-answer matching questions without boundary geometry", () => {
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

    const resolved = resolveMatchingPendingQuestion(pending, "no", gameArea);

    expect(resolved?.metadata.matchingAnswer).toBe("no");
    expect(resolved?.metadata.matchingBoundaryJson).toBeUndefined();
  });
});

describe("resolveMeasuringPendingQuestion", () => {
  it("returns null without region input metadata", () => {
    expect(
      resolveMeasuringPendingQuestion(
        basePending({ toolType: "measuring" }),
        "closer",
        gameArea,
      ),
    ).toBeNull();
  });

  it("builds measuring elimination from stored region input", () => {
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

    const resolved = resolveMeasuringPendingQuestion(
      pending,
      "further",
      gameArea,
    );

    expect(resolved?.type).toBe("measuring");
    expect(resolved?.metadata.measuringAnswer).toBe("further");
    expect(resolved?.metadata.measuringBoundaryJson).toBeTruthy();
  });
});

describe("resolveTentaclePendingQuestion", () => {
  it("returns null when poi metadata is missing", () => {
    expect(
      resolveTentaclePendingQuestion(
        basePending({ toolType: "tentacle" }),
        "poi-1",
        gameArea,
      ),
    ).toBeNull();
  });

  it("marks out-of-reach answers without a highlighted poi", () => {
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

    const resolved = resolveTentaclePendingQuestion(
      pending,
      "out-of-reach",
      gameArea,
    );

    expect(resolved?.metadata.tentacleOutOfReach).toBe(true);
    expect(resolved?.metadata.highlightedPoiId).toBeUndefined();
    expect(resolved?.metadata.tentacleAnswerRadiusMeters).toBeUndefined();
  });

  it("highlights the answered poi", () => {
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

    const resolved = resolveTentaclePendingQuestion(
      pending,
      "poi-west",
      gameArea,
    );

    expect(resolved?.metadata.tentacleOutOfReach).toBe(false);
    expect(resolved?.metadata.highlightedPoiId).toBe("poi-west");
    expect(resolved?.metadata.tentacleAnswerPoiName).toBe("West Museum");
  });

  it("stores radius from pending metadata", () => {
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

    const resolved = resolveTentaclePendingQuestion(
      pending,
      "poi-west",
      gameArea,
    );

    expect(resolved?.metadata.radiusMeters).toBe(largeRadius);
    expect(resolved?.metadata.tentacleAnswerRadiusMeters).toBe(largeRadius);
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
