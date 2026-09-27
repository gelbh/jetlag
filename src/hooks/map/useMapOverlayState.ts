import { useCallback, useMemo, useState } from "react";

/** Primary map chrome sheets + nested sheets opened from them. */
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
  /** Top of the sheet stack, or `"none"` when empty. */
  sheet: MapSheetOverlayOrNone;
  /** Full stack (bottom → top). Empty when nothing is open. */
  sheetStack: readonly MapSheetOverlay[];
  isChatOpen: boolean;
  isSettingsOpen: boolean;
  isLogOpen: boolean;
  isCodesOpen: boolean;
  isMapToolsGuideOpen: boolean;
  isReportProblemOpen: boolean;
  isCurseReferenceOpen: boolean;
  /** Settings still in the stack (may be covered by a nested sheet). */
  settingsInStack: boolean;
  /** Dock / peer open: replaces the whole stack. */
  openChat: () => void;
  openSettings: () => void;
  openLog: () => void;
  openCodes: () => void;
  openSheet: (sheet: MapSheetOverlay) => void;
  /** Hierarchical open: keeps prior sheets so close returns to them. */
  pushSheet: (sheet: MapSheetOverlay) => void;
  /** Pop one level; empty stack → none. */
  closeSheet: () => void;
  /** Clear the stack (leave overlays entirely). */
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
      settingsInStack: stack.includes("settings"),
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
