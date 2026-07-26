import { describe, expect, it } from "vitest";
import {
  foundHiderBlocked,
  isFoundHiderPending,
  isRoundComplete,
} from "./foundHider";

describe("foundHider", () => {
  it("treats a request without confirm as pending", () => {
    expect(
      isFoundHiderPending({
        foundRequestedAt: "2026-07-26T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      foundHiderBlocked({
        foundRequestedAt: "2026-07-26T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("treats foundConfirmedAt as round complete", () => {
    expect(
      isRoundComplete({
        foundConfirmedAt: "2026-07-26T12:05:00.000Z",
      }),
    ).toBe(true);
    expect(
      foundHiderBlocked({
        foundConfirmedAt: "2026-07-26T12:05:00.000Z",
        gameOutcome: "found",
      }),
    ).toBe(true);
  });

  it("treats ended_early and abandoned as round complete", () => {
    expect(isRoundComplete({ gameOutcome: "ended_early" })).toBe(true);
    expect(isRoundComplete({ gameOutcome: "abandoned" })).toBe(true);
  });

  it("treats gameOutcome found as round complete without foundConfirmedAt", () => {
    expect(isRoundComplete({ gameOutcome: "found" })).toBe(true);
    expect(foundHiderBlocked({ gameOutcome: "found" })).toBe(true);
  });

  it("is not pending or complete for an open round", () => {
    expect(isFoundHiderPending({})).toBe(false);
    expect(isRoundComplete({})).toBe(false);
    expect(foundHiderBlocked({})).toBe(false);
  });
});
