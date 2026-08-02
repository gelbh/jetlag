/** Max MapLibre camera pitch when the settings toggle is on and low-power is off. */
export const MAP_PITCH_MAX_DEGREES = 60;

/**
 * Allowed max pitch for MapLibre: flat (0) unless pitch is enabled and not low-power.
 */
export function resolveMapPitchDegrees(
  enabled: boolean,
  lowPower: boolean,
): 0 | typeof MAP_PITCH_MAX_DEGREES {
  if (!enabled || lowPower) {
    return 0;
  }
  return MAP_PITCH_MAX_DEGREES;
}
