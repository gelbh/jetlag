import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import * as adminDivisionBoundaries from "./adminDivisionBoundaries";
import {
  fetchMatchingFeaturesInArea,
  pickMatchingFeatureForAnchor,
  serializeMatchingFeatures,
  deserializeMatchingFeatures,
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

describe("matching features admin divisions", () => {
  it("loads admin divisions with stable relation ids", async () => {
    vi.spyOn(
      adminDivisionBoundaries,
      "fetchAdminDivisionFeaturesInArea",
    ).mockResolvedValue([
      {
        id: "relation/10",
        name: "West County",
        adminLevel: 6,
        representativePoint: [51.45, -0.17],
        boundary: {
          type: "Polygon",
          coordinates: [
            [
              [-0.2, 51.4],
              [-0.15, 51.4],
              [-0.15, 51.5],
              [-0.2, 51.5],
              [-0.2, 51.4],
            ],
          ],
        },
      },
    ]);

    const features = await fetchMatchingFeaturesInArea(
      sampleGameArea,
      "admin_division_2",
    );

    expect(features[0]?.id).toBe("relation/10");
    expect(features[0]?.boundary?.type).toBe("Polygon");
  });

  it("classifies the anchor from the loaded admin catalog", () => {
    const features = [
      {
        id: "relation/10",
        name: "West County",
        point: [51.45, -0.17] as [number, number],
        adminLevel: 6,
        boundary: {
          type: "Polygon" as const,
          coordinates: [
            [
              [-0.2, 51.4],
              [-0.15, 51.4],
              [-0.15, 51.5],
              [-0.2, 51.5],
              [-0.2, 51.4],
            ],
          ],
        },
      },
    ];

    const nearest = pickMatchingFeatureForAnchor(
      [51.45, -0.17],
      features,
      "admin_division_2",
    );

    expect(nearest?.id).toBe("relation/10");
    expect(nearest?.distanceMeters).toBe(0);
  });

  it("round-trips admin boundaries in serialized catalogs", () => {
    const features = [
      {
        id: "relation/10",
        name: "West County",
        point: [51.45, -0.17] as [number, number],
        adminLevel: 6,
        boundary: {
          type: "Polygon" as const,
          coordinates: [
            [
              [-0.2, 51.4],
              [-0.15, 51.4],
              [-0.15, 51.5],
              [-0.2, 51.5],
              [-0.2, 51.4],
            ],
          ],
        },
      },
    ];

    expect(deserializeMatchingFeatures(serializeMatchingFeatures(features))).toEqual(
      features,
    );
  });
});
