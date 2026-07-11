import { describe, expect, it } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import { lineStringsFromAdminDivisionBoundaries } from "./adminDivisionLineStrings";

describe("adminDivisionLineStrings", () => {
  it("extracts line strings from admin polygon rings", () => {
    const boundary: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-6.3, 53.34],
          [-6.29, 53.34],
          [-6.29, 53.35],
          [-6.3, 53.35],
          [-6.3, 53.34],
        ],
      ],
    };

    const segments = lineStringsFromAdminDivisionBoundaries([
      { boundary },
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.geometry.coordinates.length).toBeGreaterThanOrEqual(4);
  });
});
