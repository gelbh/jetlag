import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  INITIAL_TIMER_STATE,
  type TimerState,
} from "../domain/session/timer";

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
      getTimer: (sessionId) =>
        get().bySessionId[sessionId] ?? INITIAL_TIMER_STATE,
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
      name: "jetlag-timer",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        bySessionId: state.bySessionId,
      }),
    },
  ),
);
