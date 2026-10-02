import { describe, expect, it } from "vitest";
import {
  estimateOffset,
  indicatesClockJump,
  isPlausibleOffset,
  MAX_ABS_CLOCK_OFFSET_MS,
} from "./clockOffset";

describe("estimateOffset", () => {
  it("uses midpoint of lowest-RTT sample", () => {
    expect(
      estimateOffset([
        { sentAtMs: 0, receivedAtMs: 1000, serverMs: 10_000 }, // rtt 1000
        { sentAtMs: 2000, receivedAtMs: 2100, serverMs: 12_050 }, // rtt 100 → offset 10_000
      ]),
    ).toBe(10_000);
  });

  it("returns null with no samples", () => {
    expect(estimateOffset([])).toBeNull();
  });

  it("ignores samples with rtt > 10s", () => {
    expect(
      estimateOffset([{ sentAtMs: 0, receivedAtMs: 20_000, serverMs: 5 }]),
    ).toBeNull();
  });

  it("ignores samples with negative rtt", () => {
    expect(
      estimateOffset([{ sentAtMs: 100, receivedAtMs: 50, serverMs: 5 }]),
    ).toBeNull();
  });
});

describe("estimateOffset plausibility", () => {
  it("ignores samples implying more than 24h of skew", () => {
    expect(
      estimateOffset([
        { sentAtMs: 0, receivedAtMs: 10, serverMs: 2 * 24 * 60 * 60 * 1000 },
      ]),
    ).toBeNull();
  });
});

describe("indicatesClockJump", () => {
  const sample = { sentAtMs: 1_000, receivedAtMs: 1_200, serverMs: 6_100 }; // offset 5_000, rtt 200

  it("accepts a sample within RTT/2 + tolerance of the estimate", () => {
    expect(indicatesClockJump(sample, 5_900)).toBe(false);
  });

  it("flags a sample that disagrees beyond RTT/2 + tolerance", () => {
    expect(indicatesClockJump(sample, 3_000)).toBe(true);
  });
});

describe("isPlausibleOffset", () => {
  it("rejects non-finite and out-of-range offsets", () => {
    expect(isPlausibleOffset(Number.NaN)).toBe(false);
    expect(isPlausibleOffset(MAX_ABS_CLOCK_OFFSET_MS + 1)).toBe(false);
    expect(isPlausibleOffset(-5_000)).toBe(true);
  });
});
