import { afterEach, describe, expect, it, vi } from "vitest";

const getFeatureFlag = vi.hoisted(() => vi.fn());

vi.mock("posthog-js", () => ({
  default: {
    getFeatureFlag,
  },
}));

import { CASTLE_SIEGE_MODE_FLAG_KEY } from "@/domain/session/castleSiege/featureFlag";
import { isCastleSiegeModeEnabled } from "./castleSiegeFlag";

describe("isCastleSiegeModeEnabled", () => {
  afterEach(() => {
    getFeatureFlag.mockReset();
  });

  it("reads PostHog flag by stable key", () => {
    getFeatureFlag.mockReturnValue(true);
    expect(isCastleSiegeModeEnabled()).toBe(true);
    expect(getFeatureFlag).toHaveBeenCalledWith(CASTLE_SIEGE_MODE_FLAG_KEY);
  });

  it("returns false when flag value is not enabled", () => {
    getFeatureFlag.mockReturnValue("control");
    expect(isCastleSiegeModeEnabled()).toBe(false);
  });

  it("returns false when getFeatureFlag throws", () => {
    getFeatureFlag.mockImplementation(() => {
      throw new Error("sdk unavailable");
    });
    expect(isCastleSiegeModeEnabled()).toBe(false);
  });
});
