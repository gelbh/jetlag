import { useCallback, useEffect, useRef, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";

const PANEL_MINIMIZE_DELAY_MS = 400;

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [panelPeeked, setPanelPeeked] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const minimizeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setPanelPeeked(false);
    setPanelMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  const clearMinimizeTimer = useCallback(() => {
    if (minimizeTimerRef.current !== null) {
      window.clearTimeout(minimizeTimerRef.current);
      minimizeTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearMinimizeTimer, [clearMinimizeTimer]);

  const handleMapPanStart = useCallback(() => {
    if (activeTool !== "none") {
      setPanelPeeked(true);
      clearMinimizeTimer();
      minimizeTimerRef.current = window.setTimeout(() => {
        setPanelMinimized(true);
      }, PANEL_MINIMIZE_DELAY_MS);
    }
  }, [activeTool, clearMinimizeTimer]);

  const handleMapPanEnd = useCallback(() => {
    clearMinimizeTimer();
    setPanelPeeked(false);
    setPanelMinimized(false);
  }, [clearMinimizeTimer]);

  return {
    panelPeeked,
    panelMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  };
}
