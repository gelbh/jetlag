import type { DistanceUnit } from "../map/distance";
import {
  defaultAdvancedSessionSettings,
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

export type GamePresetMigrationStatus = "ok" | "manual_required";

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
  migrationStatus?: GamePresetMigrationStatus;
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

function isGameSize(value: unknown): value is GameSize {
  return value === "small" || value === "medium" || value === "large";
}

function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === "imperial" || value === "metric";
}

function mergeAdvancedSettings(
  raw: Record<string, unknown> | undefined,
  gameSize: GameSize,
  distanceUnit: DistanceUnit,
  rootCustom: {
    customMatchingAreas?: CustomMatchingAreasByLevel;
    customCategories?: readonly SessionCustomCategory[];
    customLocationPins?: readonly SessionCustomLocationPin[];
  },
): AdvancedSessionSettingsValue {
  const defaults = defaultAdvancedSessionSettings(gameSize, distanceUnit);
  const merged = {
    ...defaults,
    ...(raw ?? {}),
  } as AdvancedSessionSettingsValue;

  if (rootCustom.customMatchingAreas) {
    merged.customMatchingAreas = {
      ...merged.customMatchingAreas,
      ...rootCustom.customMatchingAreas,
    };
  }

  if (rootCustom.customCategories?.length) {
    merged.customCategories = [
      ...(merged.customCategories ?? []),
      ...rootCustom.customCategories,
    ];
  }

  if (rootCustom.customLocationPins?.length) {
    merged.customLocationPins = [
      ...(merged.customLocationPins ?? []),
      ...rootCustom.customLocationPins,
    ];
  }

  return merged;
}

export function migrateGamePreset(raw: unknown): GamePreset {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid preset data.");
  }

  const input = raw as Record<string, unknown>;
  const schemaVersion =
    typeof input.schemaVersion === "number" ? input.schemaVersion : 0;

  if (schemaVersion > GAME_PRESET_SCHEMA_VERSION) {
    return {
      id: String(input.id ?? createGamePresetId()),
      name: String(input.name ?? "Preset"),
      createdAt: String(input.createdAt ?? new Date().toISOString()),
      updatedAt: String(input.updatedAt ?? new Date().toISOString()),
      schemaVersion,
      gameSize: isGameSize(input.gameSize) ? input.gameSize : "medium",
      distanceUnit: isDistanceUnit(input.distanceUnit)
        ? input.distanceUnit
        : "imperial",
      advancedSettings: defaultAdvancedSessionSettings("medium", "imperial"),
      migrationStatus: "manual_required",
    };
  }

  const gameSize = isGameSize(input.gameSize) ? input.gameSize : "medium";
  const distanceUnit = isDistanceUnit(input.distanceUnit)
    ? input.distanceUnit
    : "imperial";

  const rootCustom = {
    customMatchingAreas: input.customMatchingAreas as
      | CustomMatchingAreasByLevel
      | undefined,
    customCategories: input.customCategories as
      | readonly SessionCustomCategory[]
      | undefined,
    customLocationPins: input.customLocationPins as
      | readonly SessionCustomLocationPin[]
      | undefined,
  };

  const advancedRaw =
    input.advancedSettings && typeof input.advancedSettings === "object"
      ? (input.advancedSettings as Record<string, unknown>)
      : undefined;

  const advancedSettings = mergeAdvancedSettings(
    advancedRaw,
    gameSize,
    distanceUnit,
    rootCustom,
  );

  return {
    id: String(input.id ?? createGamePresetId()),
    name: String(input.name ?? "Preset"),
    createdAt: String(input.createdAt ?? new Date().toISOString()),
    updatedAt: String(input.updatedAt ?? new Date().toISOString()),
    schemaVersion: GAME_PRESET_SCHEMA_VERSION,
    gameSize,
    distanceUnit,
    advancedSettings,
    gameArea: input.gameArea as GameArea | undefined,
    placeLabel:
      typeof input.placeLabel === "string" ? input.placeLabel : undefined,
    focusBounds: input.focusBounds as BoundingBox | undefined,
    sessionTier:
      input.sessionTier === "free" || input.sessionTier === "premium"
        ? input.sessionTier
        : undefined,
    customMatchingAreas: advancedSettings.customMatchingAreas,
    customCategories: advancedSettings.customCategories,
    customLocationPins: advancedSettings.customLocationPins,
    migrationStatus: "ok",
  };
}

export function migrateGamePresets(raw: unknown): GamePreset[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((preset) => {
    try {
      return migrateGamePreset(preset);
    } catch {
      return migrateGamePreset({
        id: createGamePresetId(),
        name: "Preset",
        schemaVersion: GAME_PRESET_SCHEMA_VERSION,
        gameSize: "medium",
        distanceUnit: "imperial",
        migrationStatus: "manual_required",
      });
    }
  });
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
    migrationStatus: "ok",
  };
}

export function gamePresetToCreateSessionDraft(
  preset: GamePreset,
): CreateSessionDraft {
  const migrated = migrateGamePreset(preset);
  return {
    gameSize: migrated.gameSize,
    distanceUnit: migrated.distanceUnit,
    advancedSettings: migrated.advancedSettings,
    gameArea: migrated.gameArea ?? null,
    placeLabel: migrated.placeLabel,
    focusBounds: migrated.focusBounds ?? null,
    sessionTier: migrated.sessionTier,
    customMatchingAreas: migrated.customMatchingAreas,
    customCategories: migrated.customCategories,
    customLocationPins: migrated.customLocationPins,
  };
}

export function sessionRulesPatchFromPreset(
  preset: GamePreset,
): SessionRulesPatch {
  const migrated = migrateGamePreset(preset);
  return sessionRulesPatchFromAdvancedSettings(
    migrated.gameSize,
    migrated.advancedSettings,
    migrated.distanceUnit,
  );
}
