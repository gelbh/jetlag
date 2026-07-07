import { useCallback, useState } from "react";

export type MapSheetOverlay = "none" | "chat" | "settings" | "log";

export interface UseMapOverlayStateResult {
  sheet: MapSheetOverlay;
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  isLogOpen: boolean;
  openChat: () => void;
  openSettings: () => void;
  openLog: () => void;
  closeSheet: () => void;
}

export function useMapOverlayState(): UseMapOverlayStateResult {
  const [sheet, setSheet] = useState<MapSheetOverlay>("none");

  const openChat = useCallback(() => {
    setSheet("chat");
  }, []);

  const openSettings = useCallback(() => {
    setSheet("settings");
  }, []);

  const openLog = useCallback(() => {
    setSheet("log");
  }, []);

  const closeSheet = useCallback(() => {
    setSheet("none");
  }, []);

  return {
    sheet,
    isChatOpen: sheet === "chat",
    isSettingsOpen: sheet === "settings",
    isLogOpen: sheet === "log",
    openChat,
    openSettings,
    openLog,
    closeSheet,
  };
}
