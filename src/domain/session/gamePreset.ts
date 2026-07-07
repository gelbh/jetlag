import type { DistanceUnit } from "../map/distance";
import {
  sessionRulesPatchFromAdvancedSettings,
  type AdvancedSessionSettingsValue,
  type SessionRulesPatch,
} from "./advancedSessionSettings";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "./sessionCustomContent";
import type { GameArea, SessionTier } from "../map/annotations";
import type { BoundingBox } from "../geometry/gameAreaBounds";
import type { GameSize } from "./gameSize";

export const GAME_PRESET_SCHEMA_VERSION = 1;

export interface GamePreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  advancedSettings: AdvancedSessionSettingsValue;
  gameArea?: GameArea;
  placeLabel?: string;
  focusBounds?: BoundingBox;
  sessionTier?: SessionTier;
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
  customLocationPins?: readonly SessionCustomLocationPin[];
}

export interface CreateSessionDraft {
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  advancedSettings: AdvancedSessionSettingsValue;
  gameArea?: GameArea | null;
  placeLabel?: string;
  focusBounds?: BoundingBox | null;
  sessionTier?: SessionTier;
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
  customLocationPins?: readonly SessionCustomLocationPin[];
}

export function createGamePresetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSessionDraftToGamePreset(
  draft: CreateSessionDraft,
  name: string,
  existingId?: string,
): GamePreset {
  const now = new Date().toISOString();
  return {
    id: existingId ?? createGamePresetId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: GAME_PRESET_SCHEMA_VERSION,
    gameSize: draft.gameSize,
    distanceUnit: draft.distanceUnit,
    advancedSettings: draft.advancedSettings,
    gameArea: draft.gameArea ?? undefined,
    placeLabel: draft.placeLabel,
    focusBounds: draft.focusBounds ?? undefined,
    sessionTier: draft.sessionTier,
    customMatchingAreas: draft.advancedSettings.customMatchingAreas,
    customCategories: draft.advancedSettings.customCategories,
    customLocationPins: draft.advancedSettings.customLocationPins,
  };
}

export function gamePresetToCreateSessionDraft(
  preset: GamePreset,
): CreateSessionDraft {
  return {
    gameSize: preset.gameSize,
    distanceUnit: preset.distanceUnit,
    advancedSettings: preset.advancedSettings,
    gameArea: preset.gameArea ?? null,
    placeLabel: preset.placeLabel,
    focusBounds: preset.focusBounds ?? null,
    sessionTier: preset.sessionTier,
    customMatchingAreas: preset.customMatchingAreas,
    customCategories: preset.customCategories,
    customLocationPins: preset.customLocationPins,
  };
}

export function sessionRulesPatchFromPreset(
  preset: GamePreset,
): SessionRulesPatch {
  return sessionRulesPatchFromAdvancedSettings(
    preset.gameSize,
    preset.advancedSettings,
    preset.distanceUnit,
  );
}
