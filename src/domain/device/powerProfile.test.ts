import { describe, expect, it, vi } from "vitest";
import { effectiveMapStyle, getPowerProfile, applyMapStylePreferenceChange } from "./powerProfile";

describe("powerProfile", () => {
  it("returns throttled intervals in low power mode", () => {
    const normal = getPowerProfile(false);
    const low = getPowerProfile(true);

    expect(low.timerTickMs).toBeGreaterThan(normal.timerTickMs);
    expect(low.seekerLocationSync.minIntervalMs).toBeGreaterThan(
      normal.seekerLocationSync.minIntervalMs,
    );
    expect(low.reachabilityProbeMs).toBeGreaterThan(normal.reachabilityProbeMs);
  });

  it("forces standard map tiles in low power mode", () => {
    expect(effectiveMapStyle("satellite", true)).toBe("standard");
    expect(effectiveMapStyle("satellite", false)).toBe("satellite");
  });

  it("clears low power mode when satellite is selected", () => {
    const setMapStyle = vi.fn();
    const setLowPowerMode = vi.fn();

    applyMapStylePreferenceChange("satellite", {
      lowPowerMode: true,
      setMapStyle,
      setLowPowerMode,
    });

    expect(setLowPowerMode).toHaveBeenCalledWith(false);
    expect(setMapStyle).toHaveBeenCalledWith("satellite");
  });
});
