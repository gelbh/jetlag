import { describe, expect, it } from "vitest";
import { cssPxDashToMapLibre } from "./cssPxDashToMapLibre";

describe("cssPxDashToMapLibre", () => {
  it("scales Leaflet CSS px dashes by line width", () => {
    expect(cssPxDashToMapLibre("8 6", 3)).toEqual([8 / 3, 6 / 3]);
  });

  it("returns undefined for empty or invalid dash", () => {
    expect(cssPxDashToMapLibre(undefined, 2)).toBeUndefined();
    expect(cssPxDashToMapLibre("", 2)).toBeUndefined();
    expect(cssPxDashToMapLibre("x y", 2)).toBeUndefined();
  });
});
