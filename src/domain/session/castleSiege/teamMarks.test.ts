import { describe, expect, it } from "vitest";
import { mergeTeamMarks, normalizeTeamMarksGeometry } from "./teamMarks";

const square: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

describe("normalizeTeamMarksGeometry", () => {
  it("accepts a closed polygon", () => {
    expect(normalizeTeamMarksGeometry(square)).toEqual(square);
  });

  it("rejects unclosed rings and non-finite coords", () => {
    expect(
      normalizeTeamMarksGeometry({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        ],
      }),
    ).toBeNull();
    expect(
      normalizeTeamMarksGeometry({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, Number.NaN],
            [1, 1],
            [0, 0],
          ],
        ],
      }),
    ).toBeNull();
  });
});

describe("mergeTeamMarks", () => {
  it("promotes two polygons to MultiPolygon", () => {
    const other: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ],
      ],
    };
    const merged = mergeTeamMarks(square, other);
    expect(merged.type).toBe("MultiPolygon");
    if (merged.type === "MultiPolygon") {
      expect(merged.coordinates).toHaveLength(2);
    }
  });
});
