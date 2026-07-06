import { describe, expect, it } from "vitest";
import { effectiveMapStyle, getPowerProfile } from "./powerProfile";

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
});
