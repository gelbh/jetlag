import { describe, expect, it } from "vitest";
import { resolveLandscapeMapControlInset } from "./resolveLandscapeMapControlInset";

describe("resolveLandscapeMapControlInset", () => {
  it("uses chrome-hidden when landscape chrome is collapsed on mobile", () => {
    expect(
      resolveLandscapeMapControlInset("dock", false, {
        active: true,
        collapsed: true,
        mapControlInset: "chrome-hidden",
      }),
    ).toBe("chrome-hidden");
  });

  it("keeps the base inset on desktop", () => {
    expect(
      resolveLandscapeMapControlInset("dock", true, {
        active: true,
        collapsed: true,
        mapControlInset: "chrome-hidden",
      }),
    ).toBe("dock");
  });

  it("preserves chrome-hidden when the panel is already minimized", () => {
    expect(
      resolveLandscapeMapControlInset("chrome-hidden", false, {
        active: true,
        collapsed: true,
        mapControlInset: "chrome-hidden",
      }),
    ).toBe("chrome-hidden");
  });
});
