import {
  isRadarCustomRadiusAllowedForGameSize,
  isRadarPresetAvailableForGameSize,
  radarPresetsMetersForGameSize,
} from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import { sessionGameSize, type SessionRulesInput } from "./types";

export function resolveRadarPresetsMeters(session: SessionRulesInput): number[] {
  return radarPresetsMetersForGameSize(
    sessionGameSize(session),
    sessionDistanceUnit(session),
  );
}

export function resolveIsRadarPresetAvailable(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  return isRadarPresetAvailableForGameSize(
    sessionGameSize(session),
    distanceMeters,
    sessionDistanceUnit(session),
  );
}

export function resolveIsRadarRadiusAllowed(
  session: SessionRulesInput,
  distanceMeters: number,
  chooseCustom: boolean,
): boolean {
  const gameSize = sessionGameSize(session);
  const unit = sessionDistanceUnit(session);

  if (chooseCustom) {
    return isRadarCustomRadiusAllowedForGameSize(
      gameSize,
      distanceMeters,
      unit,
    );
  }

  return resolveIsRadarPresetAvailable(session, distanceMeters);
}
