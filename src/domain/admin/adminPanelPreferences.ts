import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ADMIN_PANEL_POLL_INTERVAL_MS = 15_000;

interface AdminPanelPreferencesState {
  pollIntervalMs: number;
  multiplayerOnly: boolean;
  setPollIntervalMs: (value: number) => void;
  setMultiplayerOnly: (value: boolean) => void;
}

export const useAdminPanelPreferences = create<AdminPanelPreferencesState>()(
  persist(
    (set) => ({
      pollIntervalMs: ADMIN_PANEL_POLL_INTERVAL_MS,
      multiplayerOnly: false,
      setPollIntervalMs: (value) =>
        set({ pollIntervalMs: Math.max(5_000, Math.min(value, 120_000)) }),
      setMultiplayerOnly: (value) => set({ multiplayerOnly: value }),
    }),
    { name: "jetlag-admin-panel-preferences" },
  ),
);
