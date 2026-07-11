import type { AnnotationType } from "../map/annotations";
import type { MapTool } from "../map/mapToolTypes";
import type { DistanceUnit } from "../map/distance";
import { milesToMeters } from "../map/distance";
import {
  isRadarCustomRadiusWithinGameSizeLimit,
  isRadarPresetMetersForGameSize,
  PRESET_MATCH_TOLERANCE_METERS,
  radarPresetsMetersForGameSizeAndUnit,
  resolveDistanceUnit,
  tentacleLargeRadiusMeters,
  tentacleMediumRadiusMeters,
  thermometerPresetsMetersForGameSizeAndUnit,
} from "../map/distancePresets";
import type { GameSize } from "./gameSize";
import type { TentacleLocationCategoryId } from "../questions/tentacleQuestions";

export {
  radarPresetsMilesForGameSize,
  thermometerPresetsMilesForGameSize,
} from "../map/distancePresets";

const HIDING_PERIOD_MINUTES: Record<GameSize, number> = {
  small: 30,
  medium: 60,
  large: 180,
};

const PHOTO_ANSWER_DEADLINE_MS: Record<GameSize, number> = {
  small: 10 * 60 * 1000,
  medium: 10 * 60 * 1000,
  large: 20 * 60 * 1000,
};

const QUESTION_ANSWER_DEADLINE_MS = 5 * 60 * 1000;

const TENTACLE_MEDIUM_CATEGORIES = [
  "museum",
  "library",
  "movie_theater",
  "hospital",
] as const satisfies readonly TentacleLocationCategoryId[];

const TENTACLE_LARGE_CATEGORIES = [
  "metro_line",
  "zoo",
  "aquarium",
  "amusement_park",
] as const;

export type TentacleGameSizeCategoryId =
  | (typeof TENTACLE_MEDIUM_CATEGORIES)[number]
  | (typeof TENTACLE_LARGE_CATEGORIES)[number];

export interface TentacleOptionForGameSize {
  categoryId: TentacleGameSizeCategoryId;
  radiusMeters: number;
}

export function hidingPeriodMinutes(gameSize: GameSize): number {
  return HIDING_PERIOD_MINUTES[gameSize];
}

export function hidingPeriodMs(gameSize: GameSize): number {
  return hidingPeriodMinutes(gameSize) * 60 * 1000;
}

export function radarPresetsMetersForGameSize(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): number[] {
  return radarPresetsMetersForGameSizeAndUnit(
    gameSize,
    resolveDistanceUnit(unit),
  );
}

export function isRadarPresetAvailableForGameSize(
  gameSize: GameSize,
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): boolean {
  return isRadarPresetMetersForGameSize(
    gameSize,
    distanceMeters,
    resolveDistanceUnit(unit),
  );
}

export function isRadarCustomRadiusAllowedForGameSize(
  gameSize: GameSize,
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): boolean {
  return isRadarCustomRadiusWithinGameSizeLimit(
    gameSize,
    distanceMeters,
    resolveDistanceUnit(unit),
  );
}

export function thermometerPresetsMetersForGameSize(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): number[] {
  return thermometerPresetsMetersForGameSizeAndUnit(
    gameSize,
    resolveDistanceUnit(unit),
  );
}

export function isThermometerPresetAvailableForGameSize(
  gameSize: GameSize,
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): boolean {
  return thermometerPresetsMetersForGameSize(gameSize, unit).some(
    (preset) =>
      Math.abs(preset - distanceMeters) < PRESET_MATCH_TOLERANCE_METERS,
  );
}

export function tentacleEnabledForGameSize(gameSize: GameSize): boolean {
  return gameSize !== "small";
}

export function tentacleRadiusMeters(
  categoryId: TentacleGameSizeCategoryId,
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): number {
  const resolved = resolveDistanceUnit(unit);
  if (
    gameSize === "large" &&
    (TENTACLE_LARGE_CATEGORIES as readonly string[]).includes(categoryId)
  ) {
    return tentacleLargeRadiusMeters(resolved);
  }
  return tentacleMediumRadiusMeters(resolved);
}

export function tentacleOptionsForGameSize(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): readonly TentacleOptionForGameSize[] {
  if (!tentacleEnabledForGameSize(gameSize)) {
    return [];
  }

  const medium = TENTACLE_MEDIUM_CATEGORIES.map((categoryId) => ({
    categoryId,
    radiusMeters: tentacleRadiusMeters(categoryId, gameSize, unit),
  }));

  if (gameSize !== "large") {
    return medium;
  }

  const large = TENTACLE_LARGE_CATEGORIES.map((categoryId) => ({
    categoryId,
    radiusMeters: tentacleRadiusMeters(categoryId, gameSize, unit),
  }));

  return [...medium, ...large];
}

export function isTentacleCategoryAvailableForGameSize(
  gameSize: GameSize,
  categoryId: string,
): boolean {
  return tentacleOptionsForGameSize(gameSize).some(
    (option) => option.categoryId === categoryId,
  );
}

export function toolDockEnabled(
  toolId: Exclude<MapTool, "none">,
  gameSize: GameSize,
  options?: { hasHiders?: boolean },
): boolean {
  if (toolId === "photo") {
    return options?.hasHiders === true;
  }
  if (toolId === "tentacle") {
    return tentacleEnabledForGameSize(gameSize);
  }
  return true;
}

export function answerDeadlineMs(
  toolType: AnnotationType | "photo",
  gameSize: GameSize,
): number {
  if (toolType === "photo") {
    return PHOTO_ANSWER_DEADLINE_MS[gameSize];
  }
  return QUESTION_ANSWER_DEADLINE_MS;
}

export function gameSizeRulesSummary(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): {
  hidingPeriodLabel: string;
  hidingZoneLabel: string;
  tentacleLabel: string;
  thermometerMaxLabel: string;
} {
  const resolved = resolveDistanceUnit(unit);
  const hidingMinutes = hidingPeriodMinutes(gameSize);
  const hidingHours = hidingMinutes / 60;
  const hidingPeriodLabel =
    hidingMinutes < 60
      ? `${hidingMinutes} min hiding period`
      : `${hidingHours} hr hiding period`;

  const hidingZoneLabel =
    resolved === "metric"
      ? gameSize === "large"
        ? "800 m hiding zones"
        : "400 m hiding zones"
      : gameSize === "large"
        ? "½ mi hiding zones"
        : "¼ mi hiding zones";

  const tentacleLabel = tentacleEnabledForGameSize(gameSize)
    ? resolved === "metric"
      ? gameSize === "large"
        ? "Tentacles @ 2 km and 25 km"
        : "Tentacles @ 2 km"
      : gameSize === "large"
        ? "Tentacles @ 1 mi and 15 mi"
        : "Tentacles @ 1 mi"
    : "No tentacles";

  const thermoPresets = thermometerPresetsMetersForGameSize(gameSize, resolved);
  const maxThermo = thermoPresets[thermoPresets.length - 1] ?? 0;
  const thermometerMaxLabel =
    resolved === "metric"
      ? maxThermo >= 50_000
        ? "Thermo up to 50 km"
        : maxThermo >= 25_000
          ? "Thermo up to 25 km"
          : maxThermo >= 10_000
            ? "Thermo up to 10 km"
            : "Thermo up to 1 km"
      : maxThermo >= milesToMeters(50)
        ? "Thermo up to 50 mi"
        : maxThermo >= milesToMeters(10)
          ? "Thermo up to 10 mi"
          : maxThermo >= milesToMeters(3)
            ? "Thermo up to 3 mi"
            : "Thermo up to ½ mi";

  return {
    hidingPeriodLabel,
    hidingZoneLabel,
    tentacleLabel,
    thermometerMaxLabel,
  };
}
