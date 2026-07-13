import { describe, expect, it, vi } from "vitest";
import {
  effectiveMapStyle,
  effectiveMapTilt,
  getPowerProfile,
  applyMapStylePreferenceChange,
  applyMapTiltPreferenceChange,
} from "./powerProfile";

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

  it("forces flat map tilt in low power mode", () => {
    expect(effectiveMapTilt("flat", true)).toBe("flat");
    expect(effectiveMapTilt("flat", false)).toBe("flat");
    expect(effectiveMapTilt("tilted", true)).toBe("flat");
    expect(effectiveMapTilt("tilted", false)).toBe("tilted");
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

  it("clears low power mode when tilted map is selected", () => {
    const setMapTilt = vi.fn();
    const setLowPowerMode = vi.fn();

    applyMapTiltPreferenceChange("tilted", {
      lowPowerMode: true,
      setMapTilt,
      setLowPowerMode,
    });

    expect(setLowPowerMode).toHaveBeenCalledWith(false);
    expect(setMapTilt).toHaveBeenCalledWith("tilted");
  });
});
