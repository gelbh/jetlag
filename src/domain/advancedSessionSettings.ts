import type { GameSize } from "./gameSize";
import {
  clampHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "./gameSize";

export interface AdvancedSessionSettingsValue {
  customHidingZoneRadiusEnabled: boolean;
  hidingZoneRadiusMeters: number;
}

export function resolveAdvancedHidingZoneRadiusMeters(
  _gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
): number | undefined {
  if (!settings.customHidingZoneRadiusEnabled) {
    return undefined;
  }

  return clampHidingZoneRadiusMeters(settings.hidingZoneRadiusMeters);
}

export function defaultAdvancedSessionSettings(
  gameSize: GameSize,
): AdvancedSessionSettingsValue {
  return {
    customHidingZoneRadiusEnabled: false,
    hidingZoneRadiusMeters: hidingZoneRadiusMeters(gameSize),
  };
}
