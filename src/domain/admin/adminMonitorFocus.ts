import { create } from "zustand";

interface AdminMonitorFocusState {
  focusedPlayerUid: string | null;
  setFocusedPlayerUid: (uid: string | null) => void;
}

export const useAdminMonitorFocus = create<AdminMonitorFocusState>((set) => ({
  focusedPlayerUid: null,
  setFocusedPlayerUid: (uid) => set({ focusedPlayerUid: uid }),
}));
