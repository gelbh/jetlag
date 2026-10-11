import { create } from "zustand";

interface AdminMonitorFocusState {
  focusedPlayerUid: string | null;
  focusRequest: number;
  setFocusedPlayerUid: (uid: string | null) => void;
}

export const useAdminMonitorFocus = create<AdminMonitorFocusState>((set) => ({
  focusedPlayerUid: null,
  focusRequest: 0,
  setFocusedPlayerUid: (uid) =>
    set((state) => ({
      focusedPlayerUid: uid,
      focusRequest: uid ? state.focusRequest + 1 : state.focusRequest,
    })),
}));
