import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "../domain/annotations";
import * as overpassClient from "./overpassClient";
import {
  deserializeMatchingFeatures,
  fetchMatchingFeaturesInArea,
  findNearestMatchingFeature,
  parseMatchingFeatures,
  pickNearestMatchingFeature,
  serializeMatchingFeatures,
} from "./matchingFeatures";

const sampleGameArea: GameArea = {
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

describe("matching features", () => {
  it("filters features to the play area and picks the nearest museum", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 1,
          tags: { name: "Near Museum" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { name: "Far Museum" },
          lat: 51.42,
          lon: -0.19,
        },
        {
          id: 3,
          tags: { name: "Outside Museum" },
          lat: 51.2,
          lon: -0.5,
        },
      ],
    });

    const features = await fetchMatchingFeaturesInArea(
      sampleGameArea,
      "museum",
    );

    expect(features).toHaveLength(2);

    const nearest = await findNearestMatchingFeature(
      [51.46, -0.15],
      sampleGameArea,
      "museum",
    );

    expect(nearest?.name).toBe("Near Museum");
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("drops unnamed venues and honorary consulates", () => {
    const features = parseMatchingFeatures(
      [
        {
          id: 1,
          tags: { tourism: "zoo" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: {
            name: "Honorary Consulate",
            office: "diplomatic",
            diplomatic: "consulate",
          },
          lat: 51.45,
          lon: -0.17,
        },
        {
          id: 3,
          tags: {
            name: "US Consulate",
            office: "diplomatic",
            diplomatic: "consulate",
          },
          lat: 51.45,
          lon: -0.18,
        },
      ],
      sampleGameArea,
      "foreign_consulate",
    );

    expect(features).toEqual([
      {
        id: "3",
        name: "US Consulate",
        point: [51.45, -0.18],
      },
    ]);
  });

  it("breaks nearest-feature ties by feature id", () => {
    const nearest = pickNearestMatchingFeature(
      [51.45, -0.16],
      [
        {
          id: "b",
          name: "B",
          point: [51.45, -0.161],
        },
        {
          id: "a",
          name: "A",
          point: [51.45, -0.161],
        },
      ],
    );

    expect(nearest?.id).toBe("a");
  });

  it("round-trips serialized feature lists", () => {
    const features = [
      {
        id: "1",
        name: "City Zoo",
        point: [51.45, -0.18] as [number, number],
      },
    ];

    expect(
      deserializeMatchingFeatures(serializeMatchingFeatures(features)),
    ).toEqual(features);
  });
});
