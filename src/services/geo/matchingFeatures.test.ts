import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import * as overpassClient from "../core/overpassClient";
import {
  deserializeMatchingFeatures,
  pickNearestMatchingFeature,
  serializeMatchingFeatures,
} from "../../domain/geo/matchingAdapters";
import {
  fetchMatchingFeaturesInArea,
  findNearestMatchingFeature,
  parseMatchingFeatures,
  matchingNullAnswerMessage,
  matchingFeatureCountLabel,
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
  it("loads nearby museums and picks the nearest museum", async () => {
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
          lat: 50,
          lon: -1.5,
        },
      ],
    });

    const features = await fetchMatchingFeaturesInArea(
      sampleGameArea,
      "museum",
    );

    expect(features).toHaveLength(3);
    expect(features.filter((feature) => feature.inPlayArea)).toHaveLength(2);

    const nearest = await findNearestMatchingFeature(
      [51.46, -0.15],
      sampleGameArea,
      "museum",
    );

    expect(nearest?.name).toBe("Near Museum");
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("accepts english fallback names when name is missing", () => {
    const features = parseMatchingFeatures(
      [
        {
          id: 4,
          tags: { tourism: "museum", "name:en": "City Museum" },
          lat: 51.45,
          lon: -0.16,
        },
      ],
      sampleGameArea,
      "museum",
    );

    expect(features).toEqual([
      {
        id: "4",
        name: "City Museum",
        point: [51.45, -0.16],
        inPlayArea: true,
      },
    ]);
  });

  it("includes commercial airports outside the play area", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 10,
          tags: { name: "Dublin Airport", aeroway: "aerodrome", iata: "DUB" },
          lat: 53.421,
          lon: -6.27,
        },
      ],
    });

    const dublinCityArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-6.387, 53.298],
          [-6.114, 53.298],
          [-6.114, 53.41],
          [-6.387, 53.41],
          [-6.387, 53.298],
        ],
      ],
    };

    const features = await fetchMatchingFeaturesInArea(
      dublinCityArea,
      "commercial_airport",
    );

    expect(features).toHaveLength(1);
    expect(features[0]?.inPlayArea).toBe(false);

    const nearest = await findNearestMatchingFeature(
      [53.35, -6.26],
      dublinCityArea,
      "commercial_airport",
    );

    expect(nearest?.name).toBe("Dublin Airport");
  });

  it("builds feature count labels for nearby features", () => {
    expect(
      matchingFeatureCountLabel(3, 1, false, false),
    ).toBe("3 features (1 in play area, 2 nearby)");
  });

  it("describes null answers with category-specific guidance", () => {
    expect(matchingNullAnswerMessage("commercial_airport")).toContain(
      "commercial airport",
    );
    expect(matchingNullAnswerMessage("museum")).toContain("museum");
    expect(matchingNullAnswerMessage("landmass")).toContain("landmass");
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
        inPlayArea: true,
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
