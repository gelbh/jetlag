import { describe, expect, it } from "vitest";
import {
  CYCLE_THROTTLE_MS,
  msUntilCycleEligible,
  STUCK_CACHE_MS,
  shouldCycleFirestoreNetwork,
} from "./recoveryPolicy";

describe("shouldCycleFirestoreNetwork", () => {
  const base = { reachable: true, fromCacheSinceMs: 0, lastCycleAtMs: null, now: 6_000 };

  it("cycles when reachable but still cached after 5s", () =>
    expect(shouldCycleFirestoreNetwork(base)).toBe(true));
  it("not when unreachable", () =>
    expect(shouldCycleFirestoreNetwork({ ...base, reachable: false })).toBe(false));
  it("not when live", () =>
    expect(shouldCycleFirestoreNetwork({ ...base, fromCacheSinceMs: null })).toBe(false));
  it("not before the stuck threshold", () =>
    expect(shouldCycleFirestoreNetwork({ ...base, now: STUCK_CACHE_MS - 1 })).toBe(false));
  it("throttles to once per 30s", () =>
    expect(shouldCycleFirestoreNetwork({ ...base, lastCycleAtMs: 1_000, now: 20_000 })).toBe(
      false,
    ));
  it("allows another cycle once the throttle elapses", () =>
    expect(
      shouldCycleFirestoreNetwork({
        ...base,
        lastCycleAtMs: 1_000,
        now: 1_000 + CYCLE_THROTTLE_MS,
      }),
    ).toBe(true));
});

describe("msUntilCycleEligible", () => {
  const base = { reachable: true, fromCacheSinceMs: 0, lastCycleAtMs: null, now: 2_000 };

  it("waits out the stuck threshold", () => expect(msUntilCycleEligible(base)).toBe(3_000));
  it("waits out the throttle when it is later", () =>
    expect(msUntilCycleEligible({ ...base, lastCycleAtMs: 1_000, now: 10_000 })).toBe(21_000));
  it("is zero when already eligible", () =>
    expect(msUntilCycleEligible({ ...base, now: 9_000 })).toBe(0));
  it("is null when unreachable or live", () => {
    expect(msUntilCycleEligible({ ...base, reachable: false })).toBeNull();
    expect(msUntilCycleEligible({ ...base, fromCacheSinceMs: null })).toBeNull();
  });
});
