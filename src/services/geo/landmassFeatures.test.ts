import { describe, expect, it } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import {
  classifyLandmassAtPoint,
  computeLandmassFeatures,
  obstacleFeaturesFromElements,
} from "./landmassFeatures";

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

describe("landmass features", () => {
  it("buffers waterways and treats water polygons as obstacles", () => {
    const obstacles = obstacleFeaturesFromElements([
      {
        type: "way",
        id: 1,
        tags: { waterway: "river" },
        geometry: [
          { lat: 51.45, lon: -0.15 },
          { lat: 51.45, lon: -0.14 },
        ],
      },
      {
        type: "way",
        id: 2,
        tags: { natural: "water" },
        geometry: [
          { lat: 51.41, lon: -0.19 },
          { lat: 51.42, lon: -0.19 },
          { lat: 51.42, lon: -0.18 },
          { lat: 51.41, lon: -0.18 },
          { lat: 51.41, lon: -0.19 },
        ],
      },
    ]);

    expect(obstacles).toHaveLength(2);
    expect(obstacles[0]?.geometry.type).toBe("Polygon");
    expect(obstacles[1]?.geometry.type).toBe("Polygon");
  });

  it("returns a single mainland landmass when no obstacles intersect the play area", () => {
    const landmasses = computeLandmassFeatures(sampleGameArea, []);

    expect(landmasses).toHaveLength(1);
    expect(landmasses[0]?.name).toBe("Mainland");
    expect(landmasses[0]?.id).toBe("landmass:1");
  });

  it("splits the play area into separate landmasses across a waterway", () => {
    const landmasses = computeLandmassFeatures(sampleGameArea, [
      {
        type: "way",
        id: 3,
        tags: { waterway: "river" },
        geometry: [
          { lat: 51.4, lon: -0.15 },
          { lat: 51.5, lon: -0.15 },
        ],
      },
    ]);

    expect(landmasses.length).toBeGreaterThanOrEqual(2);
    expect(new Set(landmasses.map((landmass) => landmass.id)).size).toBe(
      landmasses.length,
    );
  });

  it("classifies anchors by containing landmass polygon", () => {
    const landmasses = computeLandmassFeatures(sampleGameArea, [
      {
        type: "way",
        id: 3,
        tags: { waterway: "river" },
        geometry: [
          { lat: 51.4, lon: -0.15 },
          { lat: 51.5, lon: -0.15 },
        ],
      },
    ]);

    const west = classifyLandmassAtPoint([51.45, -0.18], landmasses);
    const east = classifyLandmassAtPoint([51.45, -0.12], landmasses);

    expect(west).not.toBeNull();
    expect(east).not.toBeNull();
    expect(west?.id).not.toBe(east?.id);
  });
});
