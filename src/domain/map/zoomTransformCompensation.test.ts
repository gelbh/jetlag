import { describe, expect, it } from "vitest";
import {
  compensateZoomTransformWeight,
  cssZoomScale,
} from "./zoomTransformCompensation";

describe("cssZoomScale", () => {
  it("scales by powers of two like Leaflet getZoomScale", () => {
    expect(cssZoomScale(13, 12)).toBe(2);
    expect(cssZoomScale(11, 12)).toBe(0.5);
  });

  it("returns 1 for non-finite inputs", () => {
    expect(cssZoomScale(Number.NaN, 12)).toBe(1);
    expect(cssZoomScale(12, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("compensateZoomTransformWeight", () => {
  it("compensates stroke so CSS scale cancels", () => {
    expect(compensateZoomTransformWeight(2, 2)).toBe(1);
    expect(compensateZoomTransformWeight(2, 0.5)).toBe(4);
  });

  it("returns logical weight when scale is invalid", () => {
    expect(compensateZoomTransformWeight(2, 0)).toBe(2);
    expect(compensateZoomTransformWeight(2, Number.NaN)).toBe(2);
  });
});
