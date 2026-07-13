import { describe, expect, it } from "vitest";
import {
  quietRadarAnnotationStyle,
  walkRemainingAnnotationStyle,
} from "./distanceScaledAnnotationStyle";

describe("quietRadarAnnotationStyle", () => {
  it("uses lower opacity at short distances", () => {
    const short = quietRadarAnnotationStyle(100);
    const long = quietRadarAnnotationStyle(3000);

    expect(short.fillOpacity).toBeLessThan(long.fillOpacity);
    expect(short.strokeOpacity).toBeLessThan(long.strokeOpacity);
  });

  it("clamps at configured floor and ceiling", () => {
    const tiny = quietRadarAnnotationStyle(50);
    const huge = quietRadarAnnotationStyle(20_000);

    expect(tiny.fillOpacity).toBeGreaterThanOrEqual(0.04);
    expect(huge.fillOpacity).toBeLessThanOrEqual(0.14);
    expect(huge.strokeOpacity).toBeLessThanOrEqual(0.75);
  });
});

describe("walkRemainingAnnotationStyle", () => {
  it("returns muted stroke-only styling", () => {
    expect(walkRemainingAnnotationStyle()).toEqual({
      fillOpacity: 0,
      strokeOpacity: 0.45,
    });
  });
});
