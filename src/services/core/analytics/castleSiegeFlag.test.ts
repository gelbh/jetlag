import { afterEach, describe, expect, it, vi } from "vitest";

const getFeatureFlag = vi.hoisted(() => vi.fn());
const clientEnvUsesFirebaseEmulator = vi.hoisted(() => vi.fn(() => false));

vi.mock("posthog-js", () => ({
  default: {
    getFeatureFlag,
  },
}));

vi.mock("@/config/env", () => ({
  clientEnvUsesFirebaseEmulator: () => clientEnvUsesFirebaseEmulator(),
}));

import { CASTLE_SIEGE_MODE_FLAG_KEY } from "@/domain/session/castleSiege/featureFlag";
import { isCastleSiegeModeEnabled } from "./castleSiegeFlag";

describe("isCastleSiegeModeEnabled", () => {
  afterEach(() => {
    getFeatureFlag.mockReset();
    clientEnvUsesFirebaseEmulator.mockReset();
    clientEnvUsesFirebaseEmulator.mockReturnValue(false);
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

  it("returns true on Firebase emulator without reading PostHog", () => {
    clientEnvUsesFirebaseEmulator.mockReturnValue(true);
    getFeatureFlag.mockReturnValue(false);
    expect(isCastleSiegeModeEnabled()).toBe(true);
    expect(getFeatureFlag).not.toHaveBeenCalled();
  });
});
