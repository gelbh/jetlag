import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { INITIAL_TIMER_STATE, type TimerState } from "../domain/session/timer/timer";

const STORAGE_KEY = "jetlag-timer";

/**
 * One-time move from sessionStorage (pre-server-clock builds) so a running
 * hiding timer survives the upgrade. Must run before `persist` hydrates.
 */
function migrateTimerStorageFromSession(): void {
  try {
    const legacy = sessionStorage.getItem(STORAGE_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(STORAGE_KEY) === null) {
      localStorage.setItem(STORAGE_KEY, legacy);
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode / SSR): nothing to migrate.
  }
}

migrateTimerStorageFromSession();

interface TimerStoreState {
  bySessionId: Record<string, TimerState>;
  getTimer: (sessionId: string) => TimerState;
  setTimer: (sessionId: string, state: TimerState) => void;
  clearTimer: (sessionId: string) => void;
}

export const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      bySessionId: {},
      getTimer: (sessionId) => get().bySessionId[sessionId] ?? INITIAL_TIMER_STATE,
      setTimer: (sessionId, state) =>
        set((current) => ({
          bySessionId: {
            ...current.bySessionId,
            [sessionId]: state,
          },
        })),
      clearTimer: (sessionId) =>
        set((current) => {
          const next = { ...current.bySessionId };
          delete next[sessionId];
          return { bySessionId: next };
        }),
    }),
    {
      name: STORAGE_KEY,
      // localStorage so a running timer survives the PWA being killed.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bySessionId: state.bySessionId,
      }),
    },
  ),
);
