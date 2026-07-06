import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GamePreset } from "../domain/gamePreset";

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
          const existingIndex = state.presets.findIndex(
            (entry) => entry.id === preset.id,
          );
          if (existingIndex >= 0) {
            const next = [...state.presets];
            next[existingIndex] = preset;
            return { presets: next };
          }
          return { presets: [...state.presets, preset] };
        });
      },
      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
        }));
      },
      getPreset: (id) => get().presets.find((preset) => preset.id === id),
    }),
    { name: "jetlag-game-presets" },
  ),
);
