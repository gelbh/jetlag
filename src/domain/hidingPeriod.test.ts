import { describe, expect, it } from "vitest";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
} from "./hidingPeriod";

describe("hidingPeriod", () => {
  it("computes remaining hiding period time", () => {
    expect(hidingPeriodRemainingMs("small", 0)).toBe(30 * 60 * 1000);
    expect(hidingPeriodRemainingMs("small", 30 * 60 * 1000)).toBe(0);
    expect(hidingPeriodRemainingMs("medium", 15 * 60 * 1000)).toBe(
      45 * 60 * 1000,
    );
  });

  it("formats countdown labels", () => {
    expect(formatHidingPeriodCountdown(0)).toBe("Hiding period ended");
    expect(formatHidingPeriodCountdown(-1000)).toBe("Hiding period ended");
    expect(formatHidingPeriodCountdown(90_000)).toBe("01:30 hiding left");
    expect(formatHidingPeriodCountdown(3_661_000)).toBe("1:01:01 hiding left");
  });
});
