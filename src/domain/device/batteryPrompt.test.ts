import { describe, expect, it } from "vitest";
import {
  LOW_BATTERY_LEVEL,
  LOW_BATTERY_RECOVERY_LEVEL,
  shouldOfferLowPowerMode,
} from "./batteryPrompt";

describe("batteryPrompt", () => {
  it("offers low power mode when battery is low and unplugged", () => {
    expect(
      shouldOfferLowPowerMode({
        supported: true,
        level: LOW_BATTERY_LEVEL,
        charging: false,
        lowPowerMode: false,
        dismissed: false,
      }),
    ).toBe(true);
  });

  it("does not offer when charging, already in low power, or dismissed", () => {
    expect(
      shouldOfferLowPowerMode({
        supported: true,
        level: LOW_BATTERY_LEVEL,
        charging: true,
        lowPowerMode: false,
        dismissed: false,
      }),
    ).toBe(false);

    expect(
      shouldOfferLowPowerMode({
        supported: true,
        level: LOW_BATTERY_LEVEL,
        charging: false,
        lowPowerMode: true,
        dismissed: false,
      }),
    ).toBe(false);

    expect(
      shouldOfferLowPowerMode({
        supported: true,
        level: LOW_BATTERY_LEVEL,
        charging: false,
        lowPowerMode: false,
        dismissed: true,
      }),
    ).toBe(false);
  });

  it("does not offer when battery is above threshold", () => {
    expect(
      shouldOfferLowPowerMode({
        supported: true,
        level: LOW_BATTERY_RECOVERY_LEVEL,
        charging: false,
        lowPowerMode: false,
        dismissed: false,
      }),
    ).toBe(false);
  });
});
