import { describe, expect, it } from "vitest";
import {
  emptyRateState,
  formatEta,
  formatEtaSpoken,
  isOverdue,
  nextDisplayedEta,
  seedRate,
  TIMED_CEILING_FRACTION,
  TIMED_KNEE_FRACTION,
  timedFraction,
  timedRemainingMs,
  updateRate,
} from "./estimator";

describe("timedFraction", () => {
  it("is linear up to the knee at the expected duration", () => {
    expect(timedFraction(0, 1_000)).toBe(0);
    expect(timedFraction(500, 1_000)).toBeCloseTo(0.45);
    expect(timedFraction(1_000, 1_000)).toBeCloseTo(TIMED_KNEE_FRACTION);
  });

  it("keeps rising past the expected duration but stays under the ceiling", () => {
    const later = timedFraction(2_000, 1_000);
    const muchLater = timedFraction(60_000, 1_000);
    expect(later).toBeGreaterThan(TIMED_KNEE_FRACTION);
    expect(muchLater).toBeGreaterThan(later);
    expect(muchLater).toBeLessThan(TIMED_CEILING_FRACTION + 1e-9);
    expect(timedFraction(Number.MAX_SAFE_INTEGER, 1_000)).toBeLessThan(1);
  });

  it("floors a zero prior instead of dividing by zero", () => {
    expect(Number.isFinite(timedFraction(10, 0))).toBe(true);
    expect(timedFraction(10, 0)).toBeCloseTo(0.18);
  });
});

describe("timedRemainingMs", () => {
  it("counts down to the expected duration then keeps shrinking", () => {
    expect(timedRemainingMs(250, 1_000)).toBe(750);
    const atKnee = timedRemainingMs(1_000, 1_000);
    const past = timedRemainingMs(3_000, 1_000);
    expect(atKnee).toBe(500);
    expect(past).toBeLessThan(atKnee);
    expect(past).toBeGreaterThan(0);
  });
});

describe("updateRate", () => {
  it("needs a baseline sample before producing a rate", () => {
    const state = updateRate(emptyRateState(), 0, 0);
    expect(state.rate).toBeNull();
    expect(state.samples).toBe(0);
  });

  it("converges on a steady producer", () => {
    let state = updateRate(emptyRateState(), 0, 0);
    for (let step = 1; step <= 10; step += 1) {
      state = updateRate(state, step * 10, step * 100);
    }
    expect(state.rate).toBeCloseTo(0.1);
    expect(state.samples).toBe(10);
  });

  it("adapts to a rate change within five samples", () => {
    let state = updateRate(emptyRateState(), 0, 0);
    let done = 0;
    let now = 0;
    for (let step = 0; step < 5; step += 1) {
      done += 10;
      now += 100;
      state = updateRate(state, done, now);
    }
    for (let step = 0; step < 5; step += 1) {
      done += 10;
      now += 1_000;
      state = updateRate(state, done, now);
    }
    // 0.1 items/ms before the slowdown, 0.01 after; five samples close most of the gap.
    expect(state.rate).toBeGreaterThan(0.01);
    expect(state.rate).toBeLessThan(0.03);
  });

  it("ignores samples with no progress", () => {
    let state = updateRate(emptyRateState(), 5, 0);
    state = updateRate(state, 5, 100);
    expect(state.samples).toBe(0);
  });

  it("uses a seeded rate until real samples arrive", () => {
    const seeded = seedRate(emptyRateState(), 0.5);
    expect(seeded.rate).toBe(0.5);
    expect(seedRate(seeded, 2).rate).toBe(0.5);
  });
});

describe("isOverdue", () => {
  it("switches at 1.5 times the expected total", () => {
    expect(isOverdue(1_500, 1_000)).toBe(false);
    expect(isOverdue(1_501, 1_000)).toBe(true);
  });
});

describe("nextDisplayedEta", () => {
  it("shows the first estimate as is", () => {
    expect(nextDisplayedEta(null, 10_000)).toBe(10_000);
  });

  it("holds the shown value for small changes", () => {
    expect(nextDisplayedEta(20_000, 18_000)).toBe(20_000);
  });

  it("updates on a change over 20 percent or 3 seconds", () => {
    expect(nextDisplayedEta(20_000, 16_900)).toBe(16_900);
    expect(nextDisplayedEta(5_000, 3_900)).toBe(3_900);
  });

  it("clears when the raw estimate is unavailable", () => {
    expect(nextDisplayedEta(5_000, null)).toBeNull();
  });
});

describe("formatEta", () => {
  it("buckets into readable text", () => {
    expect(formatEta(2_000)).toBe("a few seconds left");
    expect(formatEta(23_000)).toBe("about 25 s left");
    expect(formatEta(6_000)).toBe("about 5 s left");
    expect(formatEta(95_000)).toBe("about 1.5 min left");
    expect(formatEta(120_000)).toBe("about 2 min left");
  });

  it("spells out units for screen readers", () => {
    expect(formatEtaSpoken(23_000)).toBe("about 25 seconds left");
    expect(formatEtaSpoken(120_000)).toBe("about 2 minutes left");
  });
});
