import { describe, expect, it } from "vitest";
import { CASTLE_SIEGE_MODE_FLAG_KEY, isCastleSiegeFlagEnabled } from "./featureFlag";

describe("isCastleSiegeFlagEnabled", () => {
  it("accepts boolean true", () => {
    expect(isCastleSiegeFlagEnabled(true)).toBe(true);
    expect(isCastleSiegeFlagEnabled(false)).toBe(false);
  });
  it("accepts common string truths", () => {
    expect(isCastleSiegeFlagEnabled("true")).toBe(true);
    expect(isCastleSiegeFlagEnabled("ON")).toBe(true);
  });
  it("rejects unknown", () => {
    expect(isCastleSiegeFlagEnabled(undefined)).toBe(false);
    expect(isCastleSiegeFlagEnabled("control")).toBe(false);
  });
  it("exports stable key", () => {
    expect(CASTLE_SIEGE_MODE_FLAG_KEY).toBe("castle-siege-mode");
  });
});
