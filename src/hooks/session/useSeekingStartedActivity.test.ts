import { describe, expect, it } from "vitest";
import { shouldEmitSeekingStarted } from "./useSeekingStartedActivity";

describe("shouldEmitSeekingStarted", () => {
  const sessionRules = { hidingPeriodMinutes: 45 };

  it("emits when controller, timer started, and hiding period elapsed", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 45 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it("does not emit while still in hiding period", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 44 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it("does not emit before the timer has started", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: true,
        hasTimerStarted: false,
        sessionRules,
        elapsedMs: 60 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it("does not emit on non-controlling clients", () => {
    expect(
      shouldEmitSeekingStarted({
        canEmit: false,
        hasTimerStarted: true,
        sessionRules,
        elapsedMs: 60 * 60 * 1000,
      }),
    ).toBe(false);
  });
});
