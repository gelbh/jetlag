import { describe, expect, it } from "vitest";
import {
  shouldApplyMapFocus,
  shouldStopMapFocusAnimation,
} from "./mapFocusPolicy";

describe("shouldApplyMapFocus", () => {
  it("skips once-mode after a successful fit without a new recenter token", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: true,
        recenterToken: 1,
        lastRecenterToken: 1,
      }),
    ).toBe(false);
  });

  it("applies once-mode when recenter token advances", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: true,
        recenterToken: 2,
        lastRecenterToken: 1,
      }),
    ).toBe(true);
  });

  it("always applies in always-mode", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "always",
        hasFitted: true,
        recenterToken: 1,
        lastRecenterToken: 1,
      }),
    ).toBe(true);
  });

  it("applies the first fit in once-mode", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: false,
        recenterToken: 0,
        lastRecenterToken: 0,
      }),
    ).toBe(true);
  });

  it("does not treat preferFly-only changes as a new apply when token unchanged", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: true,
        recenterToken: 3,
        lastRecenterToken: 3,
      }),
    ).toBe(false);
  });
});

describe("shouldStopMapFocusAnimation", () => {
  it("stops previous animation only when a new apply will run", () => {
    expect(shouldStopMapFocusAnimation({ willApply: true })).toBe(true);
    expect(shouldStopMapFocusAnimation({ willApply: false })).toBe(false);
  });
});
