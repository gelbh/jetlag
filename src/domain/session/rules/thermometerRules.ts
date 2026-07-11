import { milesToMeters } from "../../map/distance";
import { PRESET_MATCH_TOLERANCE_METERS } from "../../map/distancePresets";
import type { ThermometerDistanceOptionMiles } from "../../questions/thermometerQuestions";
import {
  isThermometerPresetAvailableForGameSize,
  thermometerPresetsMilesForGameSize,
  thermometerPresetsMetersForGameSize,
} from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import { sessionGameSize, type SessionRulesInput } from "./types";

export function resolveThermometerPresetsMiles(
  session: SessionRulesInput,
): readonly ThermometerDistanceOptionMiles[] {
  const gameSize = sessionGameSize(session);
  const defaults = thermometerPresetsMilesForGameSize(gameSize);

  if (!session.thermometerPresetMiles?.length) {
    return defaults;
  }

  const allowed = new Set(defaults);
  const selected = session.thermometerPresetMiles.filter(
    (miles): miles is ThermometerDistanceOptionMiles =>
      allowed.has(miles as ThermometerDistanceOptionMiles),
  );

  return selected.length > 0 ? selected : defaults;
}

export function resolveThermometerPresetsMeters(
  session: SessionRulesInput,
): number[] {
  const gameSize = sessionGameSize(session);
  const unit = sessionDistanceUnit(session);
  const defaults = thermometerPresetsMetersForGameSize(gameSize, unit);

  if (session.thermometerPresetMeters?.length) {
    const allowed = new Set(defaults);
    const selected = session.thermometerPresetMeters.filter((meters) =>
      [...allowed].some(
        (preset) => Math.abs(preset - meters) < PRESET_MATCH_TOLERANCE_METERS,
      ),
    );
    return selected.length > 0 ? selected : defaults;
  }

  if (session.thermometerPresetMiles?.length) {
    const allowed = new Set(defaults);
    const selected = session.thermometerPresetMiles
      .map(milesToMeters)
      .filter((meters) =>
        [...allowed].some(
          (preset) =>
            Math.abs(preset - meters) < PRESET_MATCH_TOLERANCE_METERS,
        ),
      );
    return selected.length > 0 ? selected : defaults;
  }

  return defaults;
}

export function resolveIsThermometerPresetAvailable(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  return resolveThermometerPresetsMeters(session).some(
    (preset) =>
      Math.abs(preset - distanceMeters) < PRESET_MATCH_TOLERANCE_METERS,
  );
}

/** @deprecated Use resolveIsThermometerPresetAvailable with session */
export function isThermometerPresetAvailableForSession(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  const gameSize = sessionGameSize(session);
  if (session.thermometerPresetMiles?.length) {
    return resolveIsThermometerPresetAvailable(session, distanceMeters);
  }

  return isThermometerPresetAvailableForGameSize(gameSize, distanceMeters);
}
