import { haversineMeters } from "@/domain/geometry/core/haversine";
import {
  pauseSiegeClock,
  resumeSiegeClock,
  type SiegeClockState,
  type SiegePauseReason,
} from "./siegeClocks";

/** Brief outside → soft flash. */
export const GEOFENCE_SOFT_AFTER_MS = 5_000;
/** Sustained outside → hard pause + block capture (V9). */
export const GEOFENCE_HARD_AFTER_MS = 30_000;
/** Continuous inside this long resets outside accumulator (flap hysteresis). */
export const GEOFENCE_REENTRY_RESET_MS = 3_000;

/** Soft travel anomaly when clearly above walking and not on transit corridor. */
export const TRAVEL_SOFT_MPS = 8;
/** Hard pause when speed is car-like and not near transit. */
export const TRAVEL_HARD_MPS = 35;

export type LatLng = { lat: number; lng: number };

export type SiegeGuardKind = "geofence" | "travel";

export type SiegeGuardEvent = {
  severity: "soft" | "hard";
  kind: SiegeGuardKind;
};

export type SiegeGuardState = {
  geofenceOutsideMs: number;
  geofenceInsideMs: number;
  geofenceSoftActive: boolean;
  travelSoftActive: boolean;
  /** Latched until resolve; mirrors hard pauseReason when set. */
  hardKind: SiegeGuardKind | null;
};

export type GeofenceSample = {
  kind: "geofence";
  insideZone: boolean;
  dtMs: number;
};

export type TravelSample = {
  kind: "travel";
  speedMps: number;
  nearTransitCorridor: boolean;
};

export type SiegeGuardSample = GeofenceSample | TravelSample;

export function createInitialSiegeGuards(): SiegeGuardState {
  return {
    geofenceOutsideMs: 0,
    geofenceInsideMs: 0,
    geofenceSoftActive: false,
    travelSoftActive: false,
    hardKind: null,
  };
}

export function isInsideDefenderZone(
  point: LatLng,
  zoneCenter: LatLng,
  zoneRadiusMeters: number,
): boolean {
  if (!Number.isFinite(zoneRadiusMeters) || zoneRadiusMeters <= 0) {
    return false;
  }
  return (
    haversineMeters([point.lat, point.lng], [zoneCenter.lat, zoneCenter.lng]) <= zoneRadiusMeters
  );
}

/** Capture blocked exactly when the Siege clock is paused (hard/soft pause). */
export function isCaptureAllowed(clock: SiegeClockState, _guards?: SiegeGuardState): boolean {
  void _guards;
  return !clock.paused;
}

function latchHard(
  clock: SiegeClockState,
  guards: SiegeGuardState,
  nowMs: number,
  kind: SiegeGuardKind,
): { clock: SiegeClockState; guards: SiegeGuardState; event: SiegeGuardEvent } {
  const reason: SiegePauseReason = kind;
  return {
    clock: pauseSiegeClock(clock, nowMs, reason),
    guards: {
      ...guards,
      hardKind: kind,
      geofenceSoftActive: kind === "geofence" ? false : guards.geofenceSoftActive,
      travelSoftActive: kind === "travel" ? false : guards.travelSoftActive,
    },
    event: { severity: "hard", kind },
  };
}

function applyGeofence(
  clock: SiegeClockState,
  guards: SiegeGuardState,
  nowMs: number,
  sample: GeofenceSample,
): { clock: SiegeClockState; guards: SiegeGuardState; event: SiegeGuardEvent | null } {
  if (guards.hardKind !== null) {
    return { clock, guards, event: null };
  }

  const dtMs = Math.max(0, sample.dtMs);
  if (sample.insideZone) {
    const geofenceInsideMs = guards.geofenceInsideMs + dtMs;
    if (geofenceInsideMs >= GEOFENCE_REENTRY_RESET_MS) {
      return {
        clock,
        guards: {
          ...guards,
          geofenceOutsideMs: 0,
          geofenceInsideMs: 0,
          geofenceSoftActive: false,
        },
        event: null,
      };
    }
    return {
      clock,
      guards: { ...guards, geofenceInsideMs },
      event: null,
    };
  }

  const geofenceOutsideMs = guards.geofenceOutsideMs + dtMs;
  const nextGuards: SiegeGuardState = {
    ...guards,
    geofenceOutsideMs,
    geofenceInsideMs: 0,
  };

  if (geofenceOutsideMs >= GEOFENCE_HARD_AFTER_MS) {
    return latchHard(clock, nextGuards, nowMs, "geofence");
  }

  if (geofenceOutsideMs >= GEOFENCE_SOFT_AFTER_MS) {
    const alreadySoft = guards.geofenceSoftActive;
    return {
      clock,
      guards: { ...nextGuards, geofenceSoftActive: true },
      event: alreadySoft ? null : { severity: "soft", kind: "geofence" },
    };
  }

  return { clock, guards: nextGuards, event: null };
}

function applyTravel(
  clock: SiegeClockState,
  guards: SiegeGuardState,
  nowMs: number,
  sample: TravelSample,
): { clock: SiegeClockState; guards: SiegeGuardState; event: SiegeGuardEvent | null } {
  if (guards.hardKind !== null) {
    return { clock, guards, event: null };
  }

  const speed = Number.isFinite(sample.speedMps) ? sample.speedMps : 0;
  if (sample.nearTransitCorridor || speed < TRAVEL_SOFT_MPS) {
    return {
      clock,
      guards: { ...guards, travelSoftActive: false },
      event: null,
    };
  }

  if (speed >= TRAVEL_HARD_MPS) {
    return latchHard(clock, guards, nowMs, "travel");
  }

  const alreadySoft = guards.travelSoftActive;
  return {
    clock,
    guards: { ...guards, travelSoftActive: true },
    event: alreadySoft ? null : { severity: "soft", kind: "travel" },
  };
}

/** Fold one GPS/guard sample; hard events pause the Siege clock and block capture. */
export function applySiegeGuardSample(opts: {
  clock: SiegeClockState;
  guards: SiegeGuardState;
  nowMs: number;
  sample: SiegeGuardSample;
}): { clock: SiegeClockState; guards: SiegeGuardState; event: SiegeGuardEvent | null } {
  switch (opts.sample.kind) {
    case "geofence":
      return applyGeofence(opts.clock, opts.guards, opts.nowMs, opts.sample);
    case "travel":
      return applyTravel(opts.clock, opts.guards, opts.nowMs, opts.sample);
    default: {
      const _exhaustive: never = opts.sample;
      return _exhaustive;
    }
  }
}

/** In-app resolve / safety clear after hard geofence or travel pause. */
export function resolveSiegeGuards(
  clock: SiegeClockState,
  _guards: SiegeGuardState,
  nowMs: number,
): { clock: SiegeClockState; guards: SiegeGuardState } {
  void _guards;
  return {
    clock: resumeSiegeClock(clock, nowMs),
    guards: createInitialSiegeGuards(),
  };
}
