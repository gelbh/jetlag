import { describe, expect, it } from "vitest";
import { fullJitterDelayMs } from "./backoff";

describe("fullJitterDelayMs", () => {
  it("is within [0, min(cap, base*2^n)]", () => {
    expect(fullJitterDelayMs(0, 500, 8000, () => 0.999)).toBeLessThanOrEqual(500);
    expect(fullJitterDelayMs(10, 500, 8000, () => 0.999)).toBeLessThanOrEqual(8000);
    expect(fullJitterDelayMs(3, 500, 8000, () => 0)).toBe(0);
  });

  it("grows the window exponentially until the cap", () => {
    expect(fullJitterDelayMs(2, 500, 8000, () => 0.5)).toBe(1000);
    expect(fullJitterDelayMs(6, 500, 8000, () => 0.5)).toBe(4000);
  });
});
