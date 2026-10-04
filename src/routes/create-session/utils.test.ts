import { describe, expect, it } from "vitest";
import { gpsReadingToFocusBounds } from "./utils";

describe("gpsReadingToFocusBounds", () => {
  it("returns a box around the reading, not a degenerate point", () => {
    const bounds = gpsReadingToFocusBounds(53.35, -6.26);
    const [[south, west], [north, east]] = bounds;
    expect(south).toBeLessThan(53.35);
    expect(north).toBeGreaterThan(53.35);
    expect(west).toBeLessThan(-6.26);
    expect(east).toBeGreaterThan(-6.26);
    expect(north - south).toBeGreaterThan(0.01);
    expect(east - west).toBeGreaterThan(0.01);
  });
});
