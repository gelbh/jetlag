/** Mirror of client `pressure.ts` for Functions (no TS import). */

export const PRESSURE_DECLARE_MAX_METERS = 2_000;

const WEIGHT_ASK = 0.35;
const WEIGHT_DECLARE = 0.25;
const WEIGHT_SHADE = 0.25;
const WEIGHT_SIEGE = 0.15;

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Crude shade coverage proxy from stored geometryJson size (best-effort H5 input).
 * Full polygon ∩ feasible-set area needs turf later; keep monotonic with more ink.
 */
export function shadeCoverageFromGeometryJson(geometryJson) {
  if (typeof geometryJson !== "string" || geometryJson.length === 0) {
    return 0;
  }
  // ponytail: byte-length proxy; upgrade to area ∩ feasible when Functions turf lands
  return Math.min(1, geometryJson.length / 50_000);
}

export function declareProximityFromDistance(
  distanceMeters,
  maxMeters = PRESSURE_DECLARE_MAX_METERS,
) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0 || maxMeters <= 0) {
    return 0;
  }
  return clamp01(1 - distanceMeters / maxMeters);
}

export function nearestAttackerProximityFromDistance(distanceMeters, zoneRadiusMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return 0;
  }
  const radius = Number.isFinite(zoneRadiusMeters) && zoneRadiusMeters > 0 ? zoneRadiusMeters : 500;
  if (distanceMeters <= radius) {
    return 1;
  }
  return clamp01(1 - (distanceMeters - radius) / (radius * 4));
}

export function pressureBandForScalar(scalar) {
  if (scalar >= 67) {
    return "halt";
  }
  if (scalar >= 34) {
    return "flag";
  }
  return "signal";
}

/**
 * @param {{
 *   askEliminationRatio: number,
 *   declareProximity: number,
 *   shadeCoverageRatio: number,
 *   nearestAttackerProximity: number | null,
 * }} inputs
 * @returns {{ scalar: number, band: "signal"|"flag"|"halt" }}
 */
export function computePressure(inputs) {
  const ask = clamp01(inputs.askEliminationRatio);
  const declare = clamp01(inputs.declareProximity);
  const shade = clamp01(inputs.shadeCoverageRatio);
  const siege =
    inputs.nearestAttackerProximity === null || inputs.nearestAttackerProximity === undefined
      ? null
      : clamp01(inputs.nearestAttackerProximity);

  let weighted;
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
