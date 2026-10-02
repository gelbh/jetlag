import { describe, expect, it } from "vitest";
import { shouldAppendStrokePoint, strokePointsToLineString } from "./useDrawTool";

describe("useDrawTool helpers", () => {
  it("appends the first point and skips micro jitter", () => {
    expect(shouldAppendStrokePoint([], [51.5, -0.12])).toBe(true);
    expect(shouldAppendStrokePoint([[51.5, -0.12]], [51.50001, -0.12])).toBe(false);
    expect(shouldAppendStrokePoint([[51.5, -0.12]], [51.501, -0.12])).toBe(true);
  });

  it("builds a LineString only with 2+ points", () => {
    expect(strokePointsToLineString([[51.5, -0.12]])).toBeNull();
    const feature = strokePointsToLineString([
      [51.5, -0.12],
      [51.51, -0.11],
    ]);
    expect(feature?.geometry.type).toBe("LineString");
    expect(feature?.geometry.coordinates).toEqual([
      [-0.12, 51.5],
      [-0.11, 51.51],
    ]);
  });
});
