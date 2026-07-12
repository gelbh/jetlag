import { describe, expect, it } from "vitest";
import {
  scoreDeviceSignals,
  tierFromScore,
  type DeviceSignals,
} from "./motionCapability";

const strong: DeviceSignals = {
  deviceMemory: 8,
  hardwareConcurrency: 8,
  saveData: false,
  effectiveType: "4g",
  gpuScore: 60,
  prefersReducedMotion: false,
  lowPowerMode: false,
};

describe("scoreDeviceSignals", () => {
  it("returns high score for strong device", () => {
    expect(scoreDeviceSignals(strong)).toBeGreaterThanOrEqual(72);
  });

  it("returns static tier for reduced motion", () => {
    expect(
      tierFromScore(scoreDeviceSignals({ ...strong, prefersReducedMotion: true })),
    ).toBe("static");
  });

  it("returns css tier for save-data + weak memory", () => {
    const weak: DeviceSignals = {
      deviceMemory: 2,
      hardwareConcurrency: 4,
      saveData: true,
      effectiveType: "3g",
      gpuScore: 30,
      prefersReducedMotion: false,
      lowPowerMode: false,
    };
    expect(tierFromScore(scoreDeviceSignals(weak))).toBe("css");
  });

  it("returns static for low power mode regardless of score", () => {
    expect(
      tierFromScore(scoreDeviceSignals({ ...strong, lowPowerMode: true })),
    ).toBe("static");
  });
});
