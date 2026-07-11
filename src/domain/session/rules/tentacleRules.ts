import { tentacleRadiusPresetMeters } from "../../map/distancePresets";
import {
  tentacleEnabledForGameSize,
  tentacleOptionsForGameSize,
  tentacleRadiusMeters,
  type TentacleGameSizeCategoryId,
  type TentacleOptionForGameSize,
} from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import { clampTentacleRadiusMeters } from "./clamps";
import { sessionGameSize, type SessionRulesInput } from "./types";

export function tentacleRadiusPresetsForSession(
  session: SessionRulesInput,
): readonly number[] {
  return tentacleRadiusPresetMeters(sessionDistanceUnit(session));
}

export function resolveTentaclesEnabledForSession(
  session: SessionRulesInput,
): boolean {
  const gameSize = sessionGameSize(session);

  if (session.tentaclesEnabled === true) {
    return true;
  }

  if (session.tentaclesEnabled === false) {
    return false;
  }

  return tentacleEnabledForGameSize(gameSize);
}

function resolveTentacleRadiusForCategory(
  session: SessionRulesInput,
  categoryId: TentacleGameSizeCategoryId,
): number {
  const gameSize = sessionGameSize(session);
  const isLargeCategory =
    gameSize === "large" &&
    (["metro_line", "zoo", "aquarium", "amusement_park"] as readonly string[]).includes(
      categoryId,
    );

  if (isLargeCategory && typeof session.tentacleLargeRadiusMeters === "number") {
    return clampTentacleRadiusMeters(session.tentacleLargeRadiusMeters);
  }

  if (!isLargeCategory && typeof session.tentacleMediumRadiusMeters === "number") {
    return clampTentacleRadiusMeters(session.tentacleMediumRadiusMeters);
  }

  return tentacleRadiusMeters(
    categoryId,
    gameSize,
    sessionDistanceUnit(session),
  );
}

export function resolveTentacleOptions(
  session: SessionRulesInput,
): readonly TentacleOptionForGameSize[] {
  if (!resolveTentaclesEnabledForSession(session)) {
    return [];
  }

  const gameSize = sessionGameSize(session);
  const defaults = tentacleOptionsForGameSize(
    gameSize,
    sessionDistanceUnit(session),
  );

  if (defaults.length === 0 && session.tentaclesEnabled === true) {
    const mediumCategories = [
      "museum",
      "library",
      "movie_theater",
      "hospital",
    ] as const satisfies readonly TentacleGameSizeCategoryId[];

    const medium = mediumCategories.map((categoryId) => ({
      categoryId,
      radiusMeters: resolveTentacleRadiusForCategory(session, categoryId),
    }));

    if (gameSize !== "large") {
      return medium;
    }

    const largeCategories = [
      "metro_line",
      "zoo",
      "aquarium",
      "amusement_park",
    ] as const satisfies readonly TentacleGameSizeCategoryId[];

    const large = largeCategories.map((categoryId) => ({
      categoryId,
      radiusMeters: resolveTentacleRadiusForCategory(session, categoryId),
    }));

    return [...medium, ...large];
  }

  return defaults.map((option) => ({
    categoryId: option.categoryId,
    radiusMeters: resolveTentacleRadiusForCategory(session, option.categoryId),
  }));
}
