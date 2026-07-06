import type { AnnotationType } from "./annotations";
import type { MapTool } from "./mapToolTypes";
import { milesToMeters } from "./distance";
import type { GameSize } from "./gameSize";
import type { ThermometerDistanceOptionMiles } from "./thermometerQuestions";
import type { TentacleLocationCategoryId } from "./tentacleQuestions";

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

export function thermometerPresetsMilesForGameSize(
  gameSize: GameSize,
): readonly ThermometerDistanceOptionMiles[] {
  const presets: ThermometerDistanceOptionMiles[] = [0.5, 3];
  if (gameSize === "medium" || gameSize === "large") {
    presets.push(10);
  }
  if (gameSize === "large") {
    presets.push(50);
  }
  return presets;
}

export function thermometerPresetsMetersForGameSize(
  gameSize: GameSize,
): number[] {
  return thermometerPresetsMilesForGameSize(gameSize).map(milesToMeters);
}

export function isThermometerPresetAvailableForGameSize(
  gameSize: GameSize,
  distanceMeters: number,
): boolean {
  const tolerance = 1;
  return thermometerPresetsMetersForGameSize(gameSize).some(
    (preset) => Math.abs(preset - distanceMeters) < tolerance,
  );
}

export function tentacleEnabledForGameSize(gameSize: GameSize): boolean {
  return gameSize !== "small";
}

export function tentacleRadiusMeters(
  categoryId: TentacleGameSizeCategoryId,
  gameSize: GameSize,
): number {
  if (
    gameSize === "large" &&
    (TENTACLE_LARGE_CATEGORIES as readonly string[]).includes(categoryId)
  ) {
    return milesToMeters(15);
  }
  return milesToMeters(1);
}

export function tentacleOptionsForGameSize(
  gameSize: GameSize,
): readonly TentacleOptionForGameSize[] {
  if (!tentacleEnabledForGameSize(gameSize)) {
    return [];
  }

  const medium = TENTACLE_MEDIUM_CATEGORIES.map((categoryId) => ({
    categoryId,
    radiusMeters: tentacleRadiusMeters(categoryId, gameSize),
  }));

  if (gameSize !== "large") {
    return medium;
  }

  const large = TENTACLE_LARGE_CATEGORIES.map((categoryId) => ({
    categoryId,
    radiusMeters: tentacleRadiusMeters(categoryId, gameSize),
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
): boolean {
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

export function gameSizeRulesSummary(gameSize: GameSize): {
  hidingPeriodLabel: string;
  hidingZoneLabel: string;
  tentacleLabel: string;
  thermometerMaxLabel: string;
} {
  const hidingMinutes = hidingPeriodMinutes(gameSize);
  const hidingHours = hidingMinutes / 60;
  const hidingPeriodLabel =
    hidingMinutes < 60
      ? `${hidingMinutes} min hiding period`
      : `${hidingHours} hr hiding period`;

  const hidingZoneLabel =
    gameSize === "large" ? "½ mi hiding zones" : "¼ mi hiding zones";

  const tentacleLabel = tentacleEnabledForGameSize(gameSize)
    ? gameSize === "large"
      ? "Tentacles @ 1 mi and 15 mi"
      : "Tentacles @ 1 mi"
    : "No tentacles";

  const thermoMiles = thermometerPresetsMilesForGameSize(gameSize);
  const maxThermo = thermoMiles[thermoMiles.length - 1];
  const thermometerMaxLabel =
    maxThermo === 0.5
      ? "Thermo up to ½ mi"
      : maxThermo === 3
        ? "Thermo up to 3 mi"
        : maxThermo === 10
          ? "Thermo up to 10 mi"
          : "Thermo up to 50 mi";

  return {
    hidingPeriodLabel,
    hidingZoneLabel,
    tentacleLabel,
    thermometerMaxLabel,
  };
}
