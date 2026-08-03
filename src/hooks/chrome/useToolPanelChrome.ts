import { useCallback, useEffect, useRef, useState } from "react";
import type { DockableMapTool } from "../../domain/map/mapTools";
import type { WizardSheetSnap } from "../../domain/wizard/phaseToSheetSnap";

/** Clear stuck mapPanning if dragend/moveend never arrives (ease race, remount). */
export const MAP_PANNING_SAFETY_MS = 2_000;

type ToolPanelChromeOptions = {
  /** Phase-driven sheet height; peek keeps the map clear for placement taps. */
  sheetSnap?: WizardSheetSnap;
};

export function useToolPanelChrome(
  activeTool: DockableMapTool | "none",
  options: ToolPanelChromeOptions = {},
) {
  const { sheetSnap = "mid" } = options;
  const shouldAutoPeek = sheetSnap === "peek";
  const [mapPanning, setMapPanning] = useState(false);
  const [userMinimized, setUserMinimized] = useState(false);
  const panSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPanSafetyTimer = useCallback(() => {
    if (panSafetyTimerRef.current !== null) {
      clearTimeout(panSafetyTimerRef.current);
      panSafetyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setUserMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    clearPanSafetyTimer();
  }, [activeTool, clearPanSafetyTimer]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- phase snap; user expand sticks until snap flips */
    if (shouldAutoPeek) {
      setUserMinimized(true);
    } else {
      setUserMinimized(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [shouldAutoPeek]);

  useEffect(() => () => clearPanSafetyTimer(), [clearPanSafetyTimer]);

  const handleMapPanStart = useCallback(() => {
    if (activeTool === "none") {
      return;
    }
    setMapPanning(true);
    clearPanSafetyTimer();
    panSafetyTimerRef.current = setTimeout(() => {
      panSafetyTimerRef.current = null;
      setMapPanning(false);
    }, MAP_PANNING_SAFETY_MS);
  }, [activeTool, clearPanSafetyTimer]);

  const handleMapPanEnd = useCallback(() => {
    clearPanSafetyTimer();
    setMapPanning(false);
  }, [clearPanSafetyTimer]);

  const setPanelMinimized = useCallback((minimized: boolean) => {
    setUserMinimized(minimized);
  }, []);

  return {
    mapPanning,
    panelMinimized: userMinimized || mapPanning,
    userMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  };
}
