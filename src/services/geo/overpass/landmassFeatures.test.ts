import { beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import type { GameArea } from "@/domain/map/annotations";
import { clearGeographicFeatureCacheForTests } from "../cache";
import * as overpassClient from "../../core/overpass/overpassClient";
import {
  buildLandmassQuery,
  classifyLandmassAtPoint,
  computeLandmassFeatures,
  fetchLandmassFeaturesInArea,
  obstacleFeaturesFromElements,
} from "./landmassFeatures";

vi.mock("../../core/overpass/overpassClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../core/overpass/overpassClient")>();
  return {
    ...actual,
    queryOverpass: vi.fn(actual.queryOverpass),
  };
});

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
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearGeographicFeatureCacheForTests();
  });

  it("builds a bbox landmass query that keeps way geometry", () => {
    const query = buildLandmassQuery(sampleGameArea);

    expect(query).not.toContain("area.searchArea");
    expect(query).toContain('way["natural"="water"](51.4,-0.2,51.5,-0.1)');
    expect(query).toContain(
      'way["waterway"~"^(river|canal|dock)$"](51.4,-0.2,51.5,-0.1)',
    );
    expect(query).not.toContain('relation["natural"="water"]');
    expect(query).toContain("out geom;");
    expect(query).not.toContain("out center;");
  });

  it("buffers waterways and treats water polygons as obstacles", async () => {
    const obstacles = await obstacleFeaturesFromElements([
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

  it("returns a single mainland landmass when no obstacles intersect the play area", async () => {
    const landmasses = await computeLandmassFeatures(sampleGameArea, []);

    expect(landmasses).toHaveLength(1);
    expect(landmasses[0]?.name).toBe("Mainland");
    expect(landmasses[0]?.id).toBe("landmass:1");
  });

  it("splits the play area into separate landmasses across a waterway", async () => {
    const landmasses = await computeLandmassFeatures(sampleGameArea, [
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

  it("classifies anchors by containing landmass polygon", async () => {
    const landmasses = await computeLandmassFeatures(sampleGameArea, [
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

  it("returns a single mainland for bundled metro packs without Overpass", async () => {
    const landmasses = await fetchLandmassFeaturesInArea(
      DUBLIN_CITY_GAME_AREA,
      "dublin",
    );

    expect(overpassClient.queryOverpass).not.toHaveBeenCalled();
    expect(landmasses).toHaveLength(1);
    expect(landmasses[0]?.name).toBe("Mainland");
  });

  it("keeps 51 landmass polygons instead of slicing to 50", async () => {
    const coordinates = Array.from({ length: 51 }, (_, i) => {
      const x = (i % 10) * 0.05;
      const y = Math.floor(i / 10) * 0.05;
      return [
        [
          [x, y],
          [x + 0.02, y],
          [x + 0.02, y + 0.02],
          [x, y + 0.02],
          [x, y],
        ],
      ];
    });
    const multi51: GameArea = { type: "MultiPolygon", coordinates };
    const features = await computeLandmassFeatures(multi51, []);
    expect(features).toHaveLength(51);
  });

  it("retries 413 with four child bboxes and merges elements", async () => {
    vi.mocked(overpassClient.queryOverpass)
      .mockRejectedValueOnce(new overpassClient.OverpassPayloadTooLargeError())
      .mockResolvedValueOnce({ elements: [{ id: 1 }] })
      .mockResolvedValueOnce({ elements: [{ id: 2 }] })
      .mockResolvedValueOnce({ elements: [{ id: 3 }] })
      .mockResolvedValueOnce({ elements: [{ id: 4 }] });

    const landmasses = await fetchLandmassFeaturesInArea(sampleGameArea);
    expect(overpassClient.queryOverpass.mock.calls.length).toBeGreaterThan(1);
    expect(landmasses.length).toBeGreaterThan(0);
  });

  it("rethrows 413 when bbox is already at minimum span", async () => {
    vi.mocked(overpassClient.queryOverpass).mockRejectedValue(
      new overpassClient.OverpassPayloadTooLargeError(),
    );
    const tinyGameArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0.02, 0],
          [0.02, 0.02],
          [0, 0.02],
          [0, 0],
        ],
      ],
    };
    await expect(fetchLandmassFeaturesInArea(tinyGameArea)).rejects.toBeInstanceOf(
      overpassClient.OverpassPayloadTooLargeError,
    );
  });
});
