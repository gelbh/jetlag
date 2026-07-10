import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  migrateGamePreset,
  migrateGamePresets,
  type GamePreset,
} from "../domain/session/gamePreset";

interface GamePresetState {
  presets: GamePreset[];
  savePreset: (preset: GamePreset) => void;
  deletePreset: (id: string) => void;
  getPreset: (id: string) => GamePreset | undefined;
}

export const useGamePresetStore = create<GamePresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      savePreset: (preset) => {
        set((state) => {
          const migrated = migrateGamePreset({
            ...preset,
            migrationStatus: "ok",
            schemaVersion: preset.schemaVersion,
          });
          const existingIndex = state.presets.findIndex(
            (entry) => entry.id === migrated.id,
          );
          if (existingIndex >= 0) {
            const next = [...state.presets];
            next[existingIndex] = migrated;
            return { presets: next };
          }
          return { presets: [...state.presets, migrated] };
        });
      },
      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
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
        presets: migrateGamePresets(
          (persistedState as GamePresetState | undefined)?.presets ??
            currentState.presets,
        ),
      }),
    },
  ),
);
