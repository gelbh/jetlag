import { describe, expect, it } from "vitest";
import type { GameArea } from "./annotations";
import {
  buildPendingQuestionOverlay,
  buildPendingQuestionOverlays,
} from "./pendingQuestionOverlays";
import type { PendingQuestionRecord } from "./sessionChat";
import { milesToMeters } from "./distance";
import { serializeMatchingFeatures } from "../services/matchingFeatures";

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

function basePendingQuestion(
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
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [-0.15, 51.45],
        },
      }),
      metadata: {
        radiusMeters: milesToMeters(1),
      },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Are you within 1 mi of me?",
    answerableAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPendingQuestionOverlay", () => {
  it("returns null for non-pending questions", () => {
    expect(
      buildPendingQuestionOverlay(
        basePendingQuestion({ status: "walking" }),
        gameArea,
      ),
    ).toBeNull();
  });

  it("builds radar circle and center marker without elimination shading", () => {
    const result = buildPendingQuestionOverlay(basePendingQuestion(), gameArea);

    expect(result).not.toBeNull();
    expect(result?.overlays.some((overlay) => overlay.kind === "circle")).toBe(
      true,
    );
    expect(result?.overlays.some((overlay) => overlay.kind === "marker")).toBe(
      true,
    );
    expect(result?.overlays.some((overlay) => overlay.kind === "polygon")).toBe(
      false,
    );
  });

  it("builds thermometer axis markers for pending line geometry", () => {
    const result = buildPendingQuestionOverlay(
      basePendingQuestion({
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
          metadata: {
            thermometerDistanceMeters: milesToMeters(0.5),
          },
        },
      }),
      gameArea,
    );

    expect(result?.overlays.some((overlay) => overlay.kind === "polyline")).toBe(
      true,
    );
    expect(
      result?.overlays.filter((overlay) => overlay.kind === "marker").length,
    ).toBe(2);
  });

  it("builds tentacle search circle and poi markers", () => {
    const result = buildPendingQuestionOverlay(
      basePendingQuestion({
        toolType: "tentacle",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [-0.15, 51.45],
            },
          }),
          metadata: {
            poisJson: JSON.stringify([
              {
                id: "west",
                name: "West Museum",
                lat: 51.45,
                lng: -0.18,
                category: "museum",
              },
            ]),
          },
        },
      }),
      gameArea,
    );

    expect(result?.overlays.some((overlay) => overlay.kind === "circle")).toBe(
      true,
    );
    expect(
      result?.overlays.some(
        (overlay) => overlay.kind === "marker" && overlay.popup === "West Museum",
      ),
    ).toBe(true);
  });

  it("builds matching boundary and feature markers from stored metadata", () => {
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

    const result = buildPendingQuestionOverlay(
      basePendingQuestion({
        toolType: "matching",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [-0.15, 51.45],
            },
          }),
          metadata: {
            matchingFeaturesJson: features,
            matchingNearestFeatureId: "museum-a",
            matchingNearestFeaturePoint: { lat: 51.45, lng: -0.16 },
          },
        },
      }),
      gameArea,
    );

    expect(result?.overlays.some((overlay) => overlay.kind === "polygon")).toBe(
      true,
    );
    expect(result?.overlays.filter((overlay) => overlay.kind === "marker").length).toBe(
      2,
    );
  });

  it("builds measuring boundary and target marker from region input", () => {
    const result = buildPendingQuestionOverlay(
      basePendingQuestion({
        toolType: "measuring",
        placement: {
          geometryJson: JSON.stringify({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [-0.15, 51.45],
            },
          }),
          metadata: {
            measuringCoastPoint: { lat: 51.44, lng: -0.14 },
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
      }),
      gameArea,
    );

    expect(result?.overlays.some((overlay) => overlay.kind === "marker")).toBe(
      true,
    );
  });

  it("returns null for invalid geometry", () => {
    expect(
      buildPendingQuestionOverlay(
        basePendingQuestion({
          placement: {
            geometryJson: "not-json",
            metadata: {},
          },
        }),
        gameArea,
      ),
    ).toBeNull();
  });

  it("collects overlays for all pending questions", () => {
    const results = buildPendingQuestionOverlays(
      [basePendingQuestion(), basePendingQuestion({ id: "pq-2" })],
      gameArea,
    );

    expect(results).toHaveLength(2);
  });
});
