/**
 * H5 pressure plate scorer (defenders-only meter).
 * Inputs are normalized 0–1 “tighter is hotter”; never carries coords or shade geometry.
 */

export type PressureBand = "signal" | "flag" | "halt";

export type PressureInputs = {
  /** Feasible arena eliminated by oracle Q&A (0 open → 1 exhausted). */
  askEliminationRatio: number;
  /** Closeness of last declare to true anchor (0 far → 1 at anchor). */
  declareProximity: number;
  /** Attacker shade coverage of remaining feasible set (0 none → 1 full). */
  shadeCoverageRatio: number;
  /** Siege-only nearest attacker proximity to defender zone; null outside Siege. */
  nearestAttackerProximity: number | null;
};

export type PressureReading = {
  scalar: number;
  band: PressureBand;
};

const WEIGHT_ASK = 0.35;
const WEIGHT_DECLARE = 0.25;
const WEIGHT_SHADE = 0.25;
const WEIGHT_SIEGE = 0.15;

/** Default declare distance scale for proximity (meters). */
export const PRESSURE_DECLARE_MAX_METERS = 2_000;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function declareProximityFromDistance(
  distanceMeters: number,
  maxMeters: number = PRESSURE_DECLARE_MAX_METERS,
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || maxMeters <= 0) {
    return 0;
  }
  return clamp01(1 - distanceMeters / maxMeters);
}

/** 1 at zone edge / inside; 0 when far beyond several zone radii. */
export function nearestAttackerProximityFromDistance(
  distanceMeters: number,
  zoneRadiusMeters: number,
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return 0;
  }
  const radius = Number.isFinite(zoneRadiusMeters) && zoneRadiusMeters > 0 ? zoneRadiusMeters : 500;
  if (distanceMeters <= radius) {
    return 1;
  }
  return clamp01(1 - (distanceMeters - radius) / (radius * 4));
}

export function pressureBandForScalar(scalar: number): PressureBand {
  if (scalar >= 67) {
    return "halt";
  }
  if (scalar >= 34) {
    return "flag";
  }
  return "signal";
}

/**
 * Weighted 0–100 scalar. Missing Siege GPS redistributes its weight across the other three.
 * Monotonic in each input (V13) when others are held fixed.
 */
export function computePressure(inputs: PressureInputs): PressureReading {
  const ask = clamp01(inputs.askEliminationRatio);
  const declare = clamp01(inputs.declareProximity);
  const shade = clamp01(inputs.shadeCoverageRatio);
  const siege =
    inputs.nearestAttackerProximity === null || inputs.nearestAttackerProximity === undefined
      ? null
      : clamp01(inputs.nearestAttackerProximity);

  let weighted: number;
  if (siege === null) {
    const denom = WEIGHT_ASK + WEIGHT_DECLARE + WEIGHT_SHADE;
    weighted = (ask * WEIGHT_ASK + declare * WEIGHT_DECLARE + shade * WEIGHT_SHADE) / denom;
  } else {
    weighted =
      ask * WEIGHT_ASK + declare * WEIGHT_DECLARE + shade * WEIGHT_SHADE + siege * WEIGHT_SIEGE;
  }

  const scalar = Math.round(clamp01(weighted) * 100);
  return { scalar, band: pressureBandForScalar(scalar) };
}
