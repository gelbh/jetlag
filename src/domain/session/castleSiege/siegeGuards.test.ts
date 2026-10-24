import { describe, expect, it } from "vitest";
import { createSiegeClocks } from "./siegeClocks";
import {
  applySiegeGuardSample,
  createInitialSiegeGuards,
  GEOFENCE_HARD_AFTER_MS,
  GEOFENCE_SOFT_AFTER_MS,
  isCaptureAllowed,
  isInsideDefenderZone,
  resolveSiegeGuards,
  TRAVEL_HARD_MPS,
  TRAVEL_SOFT_MPS,
} from "./siegeGuards";

const zoneCenter = { lat: 53.35, lng: -6.26 };

describe("siegeGuards geofence", () => {
  it("treats points within zone radius as inside", () => {
    expect(isInsideDefenderZone({ lat: 53.3501, lng: -6.26 }, zoneCenter, 500)).toBe(true);
    expect(isInsideDefenderZone({ lat: 53.4, lng: -6.26 }, zoneCenter, 500)).toBe(false);
  });

  it("raises soft then hard on sustained defender exit (V9)", () => {
    let clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    let guards = createInitialSiegeGuards();

    let next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: GEOFENCE_SOFT_AFTER_MS,
      sample: { kind: "geofence", insideZone: false, dtMs: GEOFENCE_SOFT_AFTER_MS },
    });
    expect(next.event).toEqual({ severity: "soft", kind: "geofence" });
    expect(next.clock.paused).toBe(false);
    expect(isCaptureAllowed(next.clock, next.guards)).toBe(true);
    guards = next.guards;
    clock = next.clock;

    next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: GEOFENCE_HARD_AFTER_MS,
      sample: {
        kind: "geofence",
        insideZone: false,
        dtMs: GEOFENCE_HARD_AFTER_MS - GEOFENCE_SOFT_AFTER_MS,
      },
    });
    expect(next.event).toEqual({ severity: "hard", kind: "geofence" });
    expect(next.clock.paused).toBe(true);
    expect(next.clock.pauseReason).toBe("geofence");
    expect(isCaptureAllowed(next.clock, next.guards)).toBe(false);
  });

  it("does not hard-pause on brief exit flaps (hysteresis)", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    let guards = createInitialSiegeGuards();

    let next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: 4_000,
      sample: { kind: "geofence", insideZone: false, dtMs: 4_000 },
    });
    guards = next.guards;

    next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: 5_500,
      sample: { kind: "geofence", insideZone: true, dtMs: 1_500 },
    });
    guards = next.guards;
    expect(guards.geofenceOutsideMs).toBeGreaterThan(0);

    next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: 10_000,
      sample: { kind: "geofence", insideZone: true, dtMs: 4_500 },
    });
    expect(next.guards.geofenceOutsideMs).toBe(0);
    expect(next.clock.paused).toBe(false);
  });
});

describe("siegeGuards travel", () => {
  it("soft-flags mid speed and hard-pauses clear non-transit", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "standard", attackingTeam: "teamA" },
    });
    let guards = createInitialSiegeGuards();

    let next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: 1_000,
      sample: { kind: "travel", speedMps: TRAVEL_SOFT_MPS + 1, nearTransitCorridor: false },
    });
    expect(next.event).toEqual({ severity: "soft", kind: "travel" });
    expect(next.clock.paused).toBe(false);
    guards = next.guards;

    next = applySiegeGuardSample({
      clock,
      guards,
      nowMs: 2_000,
      sample: { kind: "travel", speedMps: TRAVEL_HARD_MPS + 1, nearTransitCorridor: false },
    });
    expect(next.event).toEqual({ severity: "hard", kind: "travel" });
    expect(next.clock.pauseReason).toBe("travel");
    expect(isCaptureAllowed(next.clock, next.guards)).toBe(false);
  });

  it("allows high speed near transit corridor", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    const next = applySiegeGuardSample({
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: 1_000,
      sample: { kind: "travel", speedMps: TRAVEL_HARD_MPS + 5, nearTransitCorridor: true },
    });
    expect(next.event).toBeNull();
    expect(next.clock.paused).toBe(false);
  });
});

describe("resolveSiegeGuards", () => {
  it("clears hard pause and re-enables capture", () => {
    const clock = createSiegeClocks({
      nowMs: 0,
      limitSeconds: 600,
      endgame: { kind: "dualSiege" },
    });
    const guards = createInitialSiegeGuards();
    const hard = applySiegeGuardSample({
      clock,
      guards,
      nowMs: GEOFENCE_HARD_AFTER_MS,
      sample: { kind: "geofence", insideZone: false, dtMs: GEOFENCE_HARD_AFTER_MS },
    });
    const resolved = resolveSiegeGuards(hard.clock, hard.guards, GEOFENCE_HARD_AFTER_MS + 5_000);
    expect(resolved.clock.paused).toBe(false);
    expect(resolved.guards.hardKind).toBeNull();
    expect(isCaptureAllowed(resolved.clock, resolved.guards)).toBe(true);
  });
});
