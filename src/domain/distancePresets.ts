import type { DistanceUnit } from "./distance";
import { milesToMeters } from "./distance";
import type { GameSize } from "./gameSize";

/** Official metric edition hiding zone radii (m). */
export const METRIC_HIDING_ZONE_RADIUS_METERS: Record<
  "smallMedium" | "large",
  number
> = {
  smallMedium: 400,
  large: 800,
};

/** Official metric edition radar presets (m). */
export const METRIC_RADAR_PRESET_METERS = [
  500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000, 200_000,
] as const;

/** Official metric edition thermometer presets (m). */
export const METRIC_THERMOMETER_PRESET_METERS = [
  1000, 10_000, 25_000, 50_000,
] as const;

/** Official metric edition tentacle radii (m). */
export const METRIC_TENTACLE_MEDIUM_RADIUS_METERS = 2000;
export const METRIC_TENTACLE_LARGE_RADIUS_METERS = 25_000;

export const METRIC_TENTACLE_RADIUS_PRESET_METERS = [
  METRIC_TENTACLE_MEDIUM_RADIUS_METERS,
  5000,
  METRIC_TENTACLE_LARGE_RADIUS_METERS,
] as const;

export const IMPERIAL_RADAR_PRESET_MILES = [
  0.25, 0.5, 1, 3, 5, 10, 25, 50, 100,
] as const;

export const IMPERIAL_THERMOMETER_PRESET_MILES = [0.5, 3, 10, 50] as const;

export const GAME_SIZE_THRESHOLDS_SQ_KM = {
  medium: 260,
  large: 2_600,
} as const;

export const PRESET_MATCH_TOLERANCE_METERS = 5;

export function resolveDistanceUnit(
  unit: DistanceUnit | null | undefined,
): DistanceUnit {
  return unit === "metric" ? "metric" : "imperial";
}

export function radarPresetMetersForUnit(unit: DistanceUnit): readonly number[] {
  if (unit === "metric") {
    return METRIC_RADAR_PRESET_METERS;
  }

  return IMPERIAL_RADAR_PRESET_MILES.map(milesToMeters);
}

export function defaultRadarPresetMeters(unit: DistanceUnit): number {
  const presets = radarPresetMetersForUnit(unit);
  if (unit === "metric") {
    return presets[1] ?? 1000;
  }

  return presets[Math.min(2, presets.length - 1)] ?? milesToMeters(1);
}

export function thermometerAllPresetMeters(
  unit: DistanceUnit,
): readonly number[] {
  if (unit === "metric") {
    return METRIC_THERMOMETER_PRESET_METERS;
  }

  return IMPERIAL_THERMOMETER_PRESET_MILES.map(milesToMeters);
}

export function thermometerPresetsMetersForGameSizeAndUnit(
  gameSize: GameSize,
  unit: DistanceUnit,
): number[] {
  const all = thermometerAllPresetMeters(unit);
  if (unit === "metric") {
    const presets = [all[0]!, all[1]!];
    if (gameSize === "medium" || gameSize === "large") {
      presets.push(all[2]!);
    }
    if (gameSize === "large") {
      presets.push(all[3]!);
    }
    return presets;
  }

  const miles = [0.5, 3] as number[];
  if (gameSize === "medium" || gameSize === "large") {
    miles.push(10);
  }
  if (gameSize === "large") {
    miles.push(50);
  }
  return miles.map(milesToMeters);
}

export function hidingZoneDefaultRadiusMeters(
  gameSize: GameSize,
  unit: DistanceUnit,
): number {
  if (unit === "metric") {
    return gameSize === "large"
      ? METRIC_HIDING_ZONE_RADIUS_METERS.large
      : METRIC_HIDING_ZONE_RADIUS_METERS.smallMedium;
  }

  return gameSize === "large" ? milesToMeters(0.5) : milesToMeters(0.25);
}

export function tentacleMediumRadiusMeters(unit: DistanceUnit): number {
  return unit === "metric"
    ? METRIC_TENTACLE_MEDIUM_RADIUS_METERS
    : milesToMeters(1);
}

export function tentacleLargeRadiusMeters(unit: DistanceUnit): number {
  return unit === "metric"
    ? METRIC_TENTACLE_LARGE_RADIUS_METERS
    : milesToMeters(15);
}

export function tentacleRadiusPresetMeters(unit: DistanceUnit): readonly number[] {
  if (unit === "metric") {
    return METRIC_TENTACLE_RADIUS_PRESET_METERS;
  }

  return [milesToMeters(1), milesToMeters(5), milesToMeters(15)];
}

export function matchPresetMeters(
  radiusMeters: number,
  presets: readonly number[],
  tolerance = PRESET_MATCH_TOLERANCE_METERS,
): number | null {
  for (const preset of presets) {
    if (Math.abs(preset - radiusMeters) < tolerance) {
      return preset;
    }
  }

  return null;
}
