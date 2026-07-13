import type { MapTilt } from "../map/mapTilt";

export interface LiveLocationProfile {
  highAccuracy: boolean;
  minIntervalMs: number;
  minDistanceMeters: number;
}

export interface PowerProfile {
  liveLocation: LiveLocationProfile;
  seekerLocationSync: LiveLocationProfile;
  hiderLocationSync: LiveLocationProfile;
  timerTickMs: number;
  reachabilityProbeMs: number;
  queueFlushMs: number;
}

const NORMAL_PROFILE: PowerProfile = {
  liveLocation: {
    highAccuracy: false,
    minIntervalMs: 1500,
    minDistanceMeters: 5,
  },
  seekerLocationSync: {
    highAccuracy: true,
    minIntervalMs: 2000,
    minDistanceMeters: 8,
  },
  hiderLocationSync: {
    highAccuracy: false,
    minIntervalMs: 4000,
    minDistanceMeters: 15,
  },
  timerTickMs: 250,
  reachabilityProbeMs: 15_000,
  queueFlushMs: 45_000,
};

const LOW_POWER_PROFILE: PowerProfile = {
  liveLocation: {
    highAccuracy: false,
    minIntervalMs: 10_000,
    minDistanceMeters: 30,
  },
  seekerLocationSync: {
    highAccuracy: false,
    minIntervalMs: 8000,
    minDistanceMeters: 25,
  },
  hiderLocationSync: {
    highAccuracy: false,
    minIntervalMs: 12_000,
    minDistanceMeters: 35,
  },
  timerTickMs: 1000,
  reachabilityProbeMs: 60_000,
  queueFlushMs: 90_000,
};

export function getPowerProfile(lowPowerMode: boolean): PowerProfile {
  return lowPowerMode ? LOW_POWER_PROFILE : NORMAL_PROFILE;
}

export function effectiveMapStyle(
  mapStyle: "standard" | "satellite",
  lowPowerMode: boolean,
): "standard" | "satellite" {
  return lowPowerMode ? "standard" : mapStyle;
}

export function effectiveMapTilt(
  mapTilt: MapTilt,
  lowPowerMode: boolean,
): MapTilt {
  return lowPowerMode ? "flat" : mapTilt;
}

export function applyMapStylePreferenceChange(
  style: "standard" | "satellite",
  ctx: {
    lowPowerMode: boolean;
    setMapStyle: (style: "standard" | "satellite") => void;
    setLowPowerMode: (enabled: boolean) => void;
  },
): void {
  if (style === "satellite" && ctx.lowPowerMode) {
    ctx.setLowPowerMode(false);
  }

  ctx.setMapStyle(style);
}

export function applyMapTiltPreferenceChange(
  tilt: MapTilt,
  ctx: {
    lowPowerMode: boolean;
    setMapTilt: (tilt: MapTilt) => void;
    setLowPowerMode: (enabled: boolean) => void;
  },
): void {
  if (tilt === "tilted" && ctx.lowPowerMode) {
    ctx.setLowPowerMode(false);
  }

  ctx.setMapTilt(tilt);
}
