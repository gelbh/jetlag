import { describe, expect, it } from "vitest";
import { formatClockDurationFromMs, formatPrefixedClockDuration } from "./formatClockDuration";

describe("formatClockDurationFromMs", () => {
  it("formats sub-hour durations", () => {
    expect(formatClockDurationFromMs(65_000)).toBe("01:05");
  });

  it("formats hour-long durations", () => {
    expect(formatClockDurationFromMs(3_661_000)).toBe("1:01:01");
  });

  it("supports prefixed countdown labels", () => {
    expect(formatPrefixedClockDuration("HIDING", 125_000, { ceilSeconds: true })).toBe(
      "HIDING 02:05",
    );
  });
});
