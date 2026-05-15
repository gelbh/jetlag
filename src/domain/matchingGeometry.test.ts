import { describe, expect, it } from "vitest";
import type { GameArea } from "./annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "./matchingGeometry";
import type { MatchingFeature } from "../services/matchingFeatures";
import { pickNearestMatchingFeature } from "../services/matchingFeatures";
import type { LatLngTuple } from "./geometry";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { gameAreaToPolygon } from "./geometry";

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
  it("builds a same-nearest region for a single feature", () => {
    const region = buildSameNearestRegion(
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

  it("keeps the seeker anchor inside the same-nearest region", () => {
    const anchor: LatLngTuple = [51.45, -0.16];
    const nearest = pickNearestMatchingFeature(anchor, features);
    const region = buildSameNearestRegion(
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

  it("classifies grid cells with the same nearest-feature metric as the anchor", () => {
    const region = buildSameNearestRegion(features, "west", sampleGameArea);

    expect(region).not.toBeNull();
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

  it("eliminates the complement on yes and the same-nearest region on no", () => {
    const yesRegion = buildMatchingEliminationRegion(
      features,
      "west",
      sampleGameArea,
      "yes",
    );
    const noRegion = buildMatchingEliminationRegion(
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

  it("returns null when there are no features", () => {
    expect(buildSameNearestRegion([], "missing", sampleGameArea)).toBeNull();
    expect(
      buildMatchingEliminationRegion([], "missing", sampleGameArea, "yes"),
    ).toBeNull();
  });
});
