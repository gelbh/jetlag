export type DistanceUnit = "metric" | "imperial";

export const METERS_PER_MILE = 1609.344;
export const METERS_PER_FOOT = 0.3048;
export const MILE_RADIUS_PRESETS = [
  0.25, 0.5, 1, 3, 5, 10, 25, 50, 100,
] as const;

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export const DEFAULT_RADIUS_METERS = milesToMeters(1);

export function formatDistance(
  meters: number,
  unit: DistanceUnit = "metric",
): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return unit === "imperial" ? "0 mi" : "0 m";
  }

  if (unit === "imperial") {
    const miles = meters / METERS_PER_MILE;
    if (miles >= 10) {
      return `${Math.round(miles)} mi`;
    }

    if (miles >= 1) {
      return `${miles.toFixed(1)} mi`;
    }

    return `${miles.toFixed(2)} mi`;
  }

  if (meters >= 1000) {
    const kilometers = meters / 1000;
    return kilometers >= 10
      ? `${Math.round(kilometers)} km`
      : `${kilometers.toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

export function formatPresetDistance(
  meters: number,
  unit: DistanceUnit = "metric",
): string {
  if (unit === "imperial") {
    const miles = meters / METERS_PER_MILE;
    if (Math.abs(miles - 0.25) < 0.01) {
      return "1/4 mi";
    }

    if (Math.abs(miles - 0.5) < 0.01) {
      return "1/2 mi";
    }

    if (miles >= 1) {
      return `${Number.isInteger(miles) ? miles : miles.toFixed(1)} mi`;
    }

    return `${miles.toFixed(2)} mi`;
  }

  if (meters >= 1000) {
    return `${meters / 1000} km`;
  }

  return `${meters} m`;
}

export function parseDistanceInput(
  value: string,
  unit: DistanceUnit,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return unit === "imperial" ? parsed * METERS_PER_MILE : parsed;
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "imperial" ? "miles" : "meters";
}

export function formatAltitude(
  meters: number,
  unit: DistanceUnit = "metric",
): string {
  if (!Number.isFinite(meters)) {
    return unit === "imperial" ? "0 ft" : "0 m";
  }

  if (unit === "imperial") {
    const feet = Math.round(Math.abs(meters) / METERS_PER_FOOT);
    return `${feet} ft`;
  }

  return `${Math.round(Math.abs(meters))} m`;
}

export function formatAltitudeLabel(
  meters: number,
  unit: DistanceUnit = "metric",
): string {
  if (!Number.isFinite(meters) || meters === 0) {
    return "at sea level";
  }

  const magnitude = formatAltitude(meters, unit);
  return meters > 0
    ? `${magnitude} above sea level`
    : `${magnitude} below sea level`;
}
