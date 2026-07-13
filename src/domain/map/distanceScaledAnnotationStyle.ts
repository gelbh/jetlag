/** Distance-scaled opacity for quiet radar and walk projection overlays. */

const QUIET_RADAR_MIN_DISTANCE_M = 200;
const QUIET_RADAR_MAX_DISTANCE_M = 5000;
const FILL_OPACITY_FLOOR = 0.04;
const FILL_OPACITY_CEILING = 0.14;
const STROKE_OPACITY_FLOOR = 0.35;
const STROKE_OPACITY_CEILING = 0.75;

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

function distanceScale(distanceMeters: number): number {
  if (distanceMeters <= QUIET_RADAR_MIN_DISTANCE_M) {
    return 0;
  }

  if (distanceMeters >= QUIET_RADAR_MAX_DISTANCE_M) {
    return 1;
  }

  return (
    (distanceMeters - QUIET_RADAR_MIN_DISTANCE_M) /
    (QUIET_RADAR_MAX_DISTANCE_M - QUIET_RADAR_MIN_DISTANCE_M)
  );
}

export interface DistanceScaledAnnotationStyle {
  fillOpacity: number;
  strokeOpacity: number;
}

export function quietRadarAnnotationStyle(
  distanceMeters: number,
): DistanceScaledAnnotationStyle {
  const scale = distanceScale(distanceMeters);

  return {
    fillOpacity: lerp(FILL_OPACITY_FLOOR, FILL_OPACITY_CEILING, scale),
    strokeOpacity: lerp(STROKE_OPACITY_FLOOR, STROKE_OPACITY_CEILING, scale),
  };
}

export function walkRemainingAnnotationStyle(): DistanceScaledAnnotationStyle {
  return {
    fillOpacity: 0,
    strokeOpacity: 0.45,
  };
}
