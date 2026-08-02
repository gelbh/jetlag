import { describe, expect, it } from "vitest";
import { shouldApplyMapFocus } from "./mapFocusPolicy";

describe("shouldApplyMapFocus", () => {
  it("skips once-mode after a successful fit without a new recenter token", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: true,
        recenterToken: 1,
        lastRecenterToken: 1,
      }),
    ).toEqual({ apply: false, recenterRequested: false });
  });

  it("applies once-mode when recenter token advances", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: true,
        recenterToken: 2,
        lastRecenterToken: 1,
      }),
    ).toEqual({ apply: true, recenterRequested: true });
  });

  it("always applies in always-mode", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "always",
        hasFitted: true,
        recenterToken: 1,
        lastRecenterToken: 1,
      }),
    ).toEqual({ apply: true, recenterRequested: false });
  });

  it("applies the first fit in once-mode", () => {
    expect(
      shouldApplyMapFocus({
        fitBoundsMode: "once",
        hasFitted: false,
        recenterToken: 0,
        lastRecenterToken: 0,
      }),
    ).toEqual({ apply: true, recenterRequested: false });
  });
});
