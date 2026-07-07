import { describe, expect, it } from "vitest";
import type { GameArea } from "../domain/annotations";
import { inferTransitMetroId } from "../services/transitCatalog";

const londonGameArea: GameArea = {
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

describe("transit catalog", () => {
  it("infers a metro from the game area center", () => {
    expect(inferTransitMetroId(londonGameArea)).toBe("london");
  });

  it("returns null when the play area is far from known metros", () => {
    const remoteArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [20, -30],
          [21, -30],
          [21, -29],
          [20, -29],
          [20, -30],
        ],
      ],
    };

    expect(inferTransitMetroId(remoteArea)).toBeNull();
  });
});
