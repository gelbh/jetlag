import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  migrateGamePreset,
  migrateGamePresets,
  type GamePreset,
} from "../domain/session/gamePreset";
import { mergeBundledPresets } from "../domain/regions/bundledGamePresets";

interface GamePresetState {
  presets: GamePreset[];
  savePreset: (preset: GamePreset) => void;
  deletePreset: (id: string) => void;
  getPreset: (id: string) => GamePreset | undefined;
}

export const useGamePresetStore = create<GamePresetState>()(
  persist(
    (set, get) => ({
      presets: mergeBundledPresets([]),
      savePreset: (preset) => {
        set((state) => {
          const migrated = migrateGamePreset({
            ...preset,
            migrationStatus: "ok",
            schemaVersion: preset.schemaVersion,
            bundled: preset.bundled ?? false,
          });
          const existingIndex = state.presets.findIndex(
            (entry) => entry.id === migrated.id,
          );
          if (existingIndex >= 0) {
            const next = [...state.presets];
            next[existingIndex] = migrated;
            return { presets: mergeBundledPresets(next) };
          }
          return {
            presets: mergeBundledPresets([...state.presets, migrated]),
          };
        });
      },
      deletePreset: (id) => {
        set((state) => ({
          presets: mergeBundledPresets(
            state.presets.filter((preset) => preset.id !== id),
          ),
        }));
      },
      getPreset: (id) => {
        const preset = get().presets.find((entry) => entry.id === id);
        return preset ? migrateGamePreset(preset) : undefined;
      },
    }),
    {
      name: "jetlag-game-presets",
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as GamePresetState | undefined) ?? {}),
        presets: mergeBundledPresets(
          migrateGamePresets(
            (persistedState as GamePresetState | undefined)?.presets ??
              currentState.presets,
          ),
        ),
      }),
    },
  ),
);
