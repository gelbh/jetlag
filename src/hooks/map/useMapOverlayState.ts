import { useCallback, useMemo, useState } from "react";

export type MapSheetOverlay =
  | "none"
  | "chat"
  | "settings"
  | "log"
  | "codes";

export interface UseMapOverlayStateResult {
  sheet: MapSheetOverlay;
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  isLogOpen: boolean;
  isCodesOpen: boolean;
  openChat: () => void;
  openSettings: () => void;
  openLog: () => void;
  openCodes: () => void;
  openSheet: (sheet: MapSheetOverlay) => void;
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

  const openCodes = useCallback(() => {
    setSheet("codes");
  }, []);

  const openSheet = useCallback((next: MapSheetOverlay) => {
    setSheet(next);
  }, []);

  const closeSheet = useCallback(() => {
    setSheet("none");
  }, []);

  return useMemo(
    () => ({
      sheet,
      isChatOpen: sheet === "chat",
      isSettingsOpen: sheet === "settings",
      isLogOpen: sheet === "log",
      isCodesOpen: sheet === "codes",
      openChat,
      openSettings,
      openLog,
      openCodes,
      openSheet,
      closeSheet,
    }),
    [
      sheet,
      openChat,
      openSettings,
      openLog,
      openCodes,
      openSheet,
      closeSheet,
    ],
  );
}
