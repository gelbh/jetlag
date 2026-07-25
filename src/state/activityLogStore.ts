import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionActivityEvent } from "../domain/session/sessionActivityLog";

interface ActivityLogState {
  eventsBySessionId: Record<string, SessionActivityEvent[]>;
  /** Thin read helper for tests and non-selector callers. */
  getEvents: (sessionId: string) => SessionActivityEvent[];
  appendIfAbsent: (event: SessionActivityEvent) => boolean;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set, get) => ({
      eventsBySessionId: {},
      getEvents: (sessionId) => get().eventsBySessionId[sessionId] ?? [],
      appendIfAbsent: (event) => {
        const current = get().eventsBySessionId[event.sessionId] ?? [];
        if (current.some((item) => item.id === event.id)) {
          return false;
        }

        set((state) => ({
          eventsBySessionId: {
            ...state.eventsBySessionId,
            [event.sessionId]: [
              ...(state.eventsBySessionId[event.sessionId] ?? []),
              event,
            ],
          },
        }));
        return true;
      },
    }),
    {
      name: "jetlag-activity-log",
      partialize: (state) => ({
        eventsBySessionId: state.eventsBySessionId,
      }),
    },
  ),
);
