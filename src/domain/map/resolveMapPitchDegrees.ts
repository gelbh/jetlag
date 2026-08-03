/** Max MapLibre camera pitch when low-power is off. */
export const MAP_PITCH_MAX_DEGREES = 60;

/**
 * Allowed max pitch for MapLibre: flat (0) in low-power; otherwise max tilt.
 */
export function resolveMapPitchDegrees(
  lowPower: boolean,
): 0 | typeof MAP_PITCH_MAX_DEGREES {
  if (lowPower) {
    return 0;
  }
  return MAP_PITCH_MAX_DEGREES;
}
