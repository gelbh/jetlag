import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameArea, SessionRecord } from "../domain/annotations";

export type { MapTool } from "../domain/mapToolTypes";
export { useAnnotationStore } from "./annotationStore";
export { useMapStore, type LayerVisibility } from "./mapStore";

interface SessionState {
  session: SessionRecord | null;
  pendingWrites: number;
  syncInFlight: number;
  lastSyncError: string | null;
  remoteUpdateNotice: string | null;
  setSession: (session: SessionRecord | null) => void;
  setGameArea: (gameArea: GameArea) => void;
  setPendingWrites: (count: number) => void;
  incrementPendingWrites: () => void;
  decrementPendingWrites: () => void;
  incrementSyncInFlight: () => void;
  decrementSyncInFlight: () => void;
  setLastSyncError: (message: string | null) => void;
  setRemoteUpdateNotice: (message: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      pendingWrites: 0,
      syncInFlight: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
      setSession: (session) => set({ session }),
      setGameArea: (gameArea) =>
        set((state) =>
          state.session
            ? {
                session: {
                  ...state.session,
                  gameArea,
                },
              }
            : state,
        ),
      setPendingWrites: (pendingWrites) => set({ pendingWrites }),
      incrementPendingWrites: () =>
        set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
      decrementPendingWrites: () =>
        set((state) => ({
          pendingWrites: Math.max(0, state.pendingWrites - 1),
        })),
      incrementSyncInFlight: () =>
        set((state) => ({ syncInFlight: state.syncInFlight + 1 })),
      decrementSyncInFlight: () =>
        set((state) => ({
          syncInFlight: Math.max(0, state.syncInFlight - 1),
        })),
      setLastSyncError: (lastSyncError) => set({ lastSyncError }),
      setRemoteUpdateNotice: (remoteUpdateNotice) =>
        set({ remoteUpdateNotice }),
    }),
    {
      name: "jetlag-session",
      partialize: (state) => ({
        session: state.session,
      }),
    },
  ),
);
