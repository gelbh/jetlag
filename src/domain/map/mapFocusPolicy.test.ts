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

  it("skips once-mode when hasFitted and recenterToken unchanged", () => {
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
