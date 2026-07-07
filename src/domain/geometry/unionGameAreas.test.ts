import { describe, expect, it } from "vitest";
import type { GameArea } from "../map/annotations";
import { unionGameAreas } from "./unionGameAreas";
import { gameAreaToBoundingBox } from "./gameAreaBounds";

const dublin: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.2],
      [-6.1, 53.2],
      [-6.1, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.2],
    ],
  ],
};

const cork: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-8.6, 51.8],
      [-8.3, 51.8],
      [-8.3, 52.0],
      [-8.6, 52.0],
      [-8.6, 51.8],
    ],
  ],
};

describe("unionGameAreas", () => {
  it("returns the single area unchanged", () => {
    expect(unionGameAreas([dublin])).toEqual(dublin);
  });

  it("unions disjoint regions into one MultiPolygon or Polygon", () => {
    const union = unionGameAreas([dublin, cork]);
    const box = gameAreaToBoundingBox(union);

    expect(box.south).toBeLessThanOrEqual(51.8);
    expect(box.north).toBeGreaterThanOrEqual(53.4);
    expect(box.west).toBeLessThanOrEqual(-8.6);
    expect(box.east).toBeGreaterThanOrEqual(-6.1);
  });
});
