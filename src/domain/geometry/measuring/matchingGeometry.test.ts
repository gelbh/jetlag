import { describe, expect, it } from "vitest";
import type { GameArea } from "../../map/annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "./matchingGeometry";
import type { MatchingFeature } from "@/domain/geo/types";
import { pickNearestMatchingFeature } from "@/domain/geo/matchingAdapters";
import type { LatLngTuple } from "../gameArea/geometry";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { gameAreaToPolygon } from "../gameArea/geometry";

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

const features: MatchingFeature[] = [
  {
    id: "west",
    name: "West Museum",
    point: [51.45, -0.18],
  },
  {
    id: "east",
    name: "East Museum",
    point: [51.45, -0.12],
  },
];

describe("matching geometry", () => {
  it("builds a same-nearest region for a single feature", async () => {
    const region = await buildSameNearestRegion(
      [features[0]],
      "west",
      sampleGameArea,
    );

    expect(region?.geometry.type).toBe("Polygon");
    expect(
      booleanPointInPolygon(
        turfPoint([-0.15, 51.45]),
        region ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
  });

  it("keeps the seeker anchor inside the same-nearest region", async () => {
    const anchor: LatLngTuple = [51.45, -0.16];
    const nearest = pickNearestMatchingFeature(anchor, features);
    const region = await buildSameNearestRegion(
      features,
      nearest?.id ?? "west",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(
      booleanPointInPolygon(
        turfPoint([anchor[1], anchor[0]]),
        region ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
  });

  it("partitions the play area by nearest feature using Voronoi cells", async () => {
    const region = await buildSameNearestRegion(
      features,
      "west",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(region?.geometry.type).toBe("Polygon");
    expect(
      booleanPointInPolygon(
        turfPoint([-0.17, 51.45]),
        region ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
    expect(
      booleanPointInPolygon(
        turfPoint([-0.13, 51.45]),
        region ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(false);
  });

  it("produces a smooth single polygon rather than a coarse grid of rectangles", async () => {
    const region = await buildSameNearestRegion(
      features,
      "west",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(region?.geometry.type).toBe("Polygon");

    const ring =
      region?.geometry.type === "Polygon"
        ? region.geometry.coordinates[0]
        : null;
    expect(ring).not.toBeNull();
    // A Voronoi cell clipped to a rectangle has a modest vertex count;
    // the old grid produced a MultiPolygon of hundreds of axis-aligned rects.
    expect(ring!.length).toBeLessThan(20);
    expect(ring!.length).toBeGreaterThan(4);
  });

  it("eliminates the complement on yes and the same-nearest region on no", async () => {
    const yesRegion = await buildMatchingEliminationRegion(
      features,
      "west",
      sampleGameArea,
      "yes",
    );
    const noRegion = await buildMatchingEliminationRegion(
      features,
      "west",
      sampleGameArea,
      "no",
    );

    expect(yesRegion).not.toBeNull();
    expect(noRegion).not.toBeNull();
    expect(
      booleanPointInPolygon(
        turfPoint([-0.13, 51.45]),
        yesRegion ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
    expect(
      booleanPointInPolygon(
        turfPoint([-0.17, 51.45]),
        noRegion ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
  });

  it("returns null when there are no features", async () => {
    expect(
      await buildSameNearestRegion([], "missing", sampleGameArea),
    ).toBeNull();
    expect(
      await buildMatchingEliminationRegion(
        [],
        "missing",
        sampleGameArea,
        "yes",
      ),
    ).toBeNull();
  });

  it("Voronoi same-nearest region contains its own feature for a small clustered grid", async () => {
    const gridGameArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-0.3, 51.3],
          [-0.1, 51.3],
          [-0.1, 51.5],
          [-0.3, 51.5],
          [-0.3, 51.3],
        ],
      ],
    };

    const gridFeatures: MatchingFeature[] = Array.from(
      { length: 4 },
      (_, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        return {
          id: `grid-${index}`,
          name: `Grid Feature ${index}`,
          point: [51.4 + row * 0.003, -0.2 + col * 0.003] as LatLngTuple,
        };
      },
    );

    for (const feature of gridFeatures) {
      const region = await buildSameNearestRegion(
        gridFeatures,
        feature.id,
        gridGameArea,
      );

      expect(region, `no region for ${feature.id}`).not.toBeNull();
      expect(
        booleanPointInPolygon(
          turfPoint([feature.point[1], feature.point[0]]),
          region!,
        ),
        `${feature.id} not inside its own same-nearest region`,
      ).toBe(true);
    }
  });
});
