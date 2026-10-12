import { describe, expect, it } from "vitest";
import type { TentaclePoi } from "@/domain/map/annotations";
import { tentacleQuestionPrompt } from "@/domain/questions";
import { buildTentaclePendingInput } from "./tentaclePendingInput";

const pois: TentaclePoi[] = [
  { id: "poi-a", name: "British Museum", lat: 51.519, lng: -0.127, category: "museum" },
  { id: "poi-b", name: "Science Museum", lat: 51.497, lng: -0.174, category: "museum" },
];

describe("buildTentaclePendingInput", () => {
  it("builds the pending payload with a reply per POI plus out of reach", () => {
    expect(
      buildTentaclePendingInput({
        center: [51.5, -0.15],
        categoryId: "museum",
        pois,
        searchRadiusMeters: 1609,
        distanceUnit: "imperial",
        cardDraw: 4,
        cardKeep: 2,
      }),
    ).toEqual({
      promptText: tentacleQuestionPrompt("museum", "imperial", 1609),
      replyOptions: [
        { id: "poi-a", label: "British Museum" },
        { id: "poi-b", label: "Science Museum" },
        { id: "out-of-reach", label: "Not within reach" },
      ],
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.5] },
        }),
        metadata: {
          tentacleCategoryId: "museum",
          radiusMeters: 1609,
          centerJson: JSON.stringify({ lat: 51.5, lng: -0.15 }),
          poisJson: JSON.stringify(pois),
        },
      },
      cardDraw: 4,
      cardKeep: 2,
    });
  });
});
