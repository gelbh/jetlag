import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionActivityEvent } from "../domain/session/sessionActivityLog";

interface ActivityLogState {
  eventsBySessionId: Record<string, SessionActivityEvent[]>;
  getEvents: (sessionId: string) => SessionActivityEvent[];
  upsertEvent: (event: SessionActivityEvent) => void;
  setEvents: (sessionId: string, events: SessionActivityEvent[]) => void;
  appendIfAbsent: (event: SessionActivityEvent) => boolean;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set, get) => ({
      eventsBySessionId: {},
      getEvents: (sessionId) => get().eventsBySessionId[sessionId] ?? [],
      upsertEvent: (event) =>
        set((state) => {
          const current = state.eventsBySessionId[event.sessionId] ?? [];
          const existingIndex = current.findIndex((item) => item.id === event.id);

          if (existingIndex === -1) {
            return {
              eventsBySessionId: {
                ...state.eventsBySessionId,
                [event.sessionId]: [...current, event],
              },
            };
          }

          const next = [...current];
          next[existingIndex] = event;
          return {
            eventsBySessionId: {
              ...state.eventsBySessionId,
              [event.sessionId]: next,
            },
          };
        }),
      setEvents: (sessionId, events) =>
        set((state) => ({
          eventsBySessionId: {
            ...state.eventsBySessionId,
            [sessionId]: events,
          },
        })),
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
