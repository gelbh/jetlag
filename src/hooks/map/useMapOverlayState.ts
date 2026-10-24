import { useCallback, useMemo, useState } from "react";

export type MapSheetOverlay =
  | "chat"
  | "settings"
  | "log"
  | "codes"
  | "map-tools-guide"
  | "report-problem"
  | "curse-reference";

export type MapSheetOverlayOrNone = MapSheetOverlay | "none";

export interface UseMapOverlayStateResult {
  sheet: MapSheetOverlayOrNone;
  sheetStack: readonly MapSheetOverlay[];
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  isLogOpen: boolean;
  isCodesOpen: boolean;
  isMapToolsGuideOpen: boolean;
  isReportProblemOpen: boolean;
  isCurseReferenceOpen: boolean;
  openChat: () => void;
  openSettings: () => void;
  openLog: () => void;
  openCodes: () => void;
  openSheet: (sheet: MapSheetOverlay) => void;
  pushSheet: (sheet: MapSheetOverlay) => void;
  closeSheet: () => void;
  closeAllSheets: () => void;
}

export function useMapOverlayState(): UseMapOverlayStateResult {
  const [stack, setStack] = useState<MapSheetOverlay[]>([]);

  const openSheet = useCallback((next: MapSheetOverlay) => {
    setStack([next]);
  }, []);

  const pushSheet = useCallback((next: MapSheetOverlay) => {
    setStack((current) => {
      if (current.at(-1) === next) {
        return current;
      }
      return [...current, next];
    });
  }, []);

  const closeSheet = useCallback(() => {
    setStack((current) => current.slice(0, -1));
  }, []);

  const closeAllSheets = useCallback(() => {
    setStack([]);
  }, []);

  const openChat = useCallback(() => {
    setStack(["chat"]);
  }, []);

  const openSettings = useCallback(() => {
    setStack(["settings"]);
  }, []);

  const openLog = useCallback(() => {
    setStack(["log"]);
  }, []);

  const openCodes = useCallback(() => {
    setStack(["codes"]);
  }, []);

  const sheet: MapSheetOverlayOrNone = stack.at(-1) ?? "none";

  return useMemo(
    () => ({
      sheet,
      sheetStack: stack,
      isChatOpen: sheet === "chat",
      isSettingsOpen: sheet === "settings",
      isLogOpen: sheet === "log",
      isCodesOpen: sheet === "codes",
      isMapToolsGuideOpen: sheet === "map-tools-guide",
      isReportProblemOpen: sheet === "report-problem",
      isCurseReferenceOpen: sheet === "curse-reference",
      openChat,
      openSettings,
      openLog,
      openCodes,
      openSheet,
      pushSheet,
      closeSheet,
      closeAllSheets,
    }),
    [
      sheet,
      stack,
      openChat,
      openSettings,
      openLog,
      openCodes,
      openSheet,
      pushSheet,
      closeSheet,
      closeAllSheets,
    ],
  );
}
