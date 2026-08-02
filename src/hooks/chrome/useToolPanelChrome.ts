import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../../domain/map/mapTools";

type ToolPanelChromeOptions = {
  /** Peek while placing so map clicks aren't covered; expand still sticks until this clears. */
  autoPeek?: boolean;
};

export function useToolPanelChrome(
  activeTool: DockableMapTool | "none",
  options: ToolPanelChromeOptions = {},
) {
  const { autoPeek = false } = options;
  const [mapPanning, setMapPanning] = useState(false);
  const [userMinimized, setUserMinimized] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setUserMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- placement auto-peek; user expand sticks until autoPeek flips */
    if (autoPeek) {
      setUserMinimized(true);
    } else {
      setUserMinimized(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [autoPeek]);

  const handleMapPanStart = useCallback(() => {
    if (activeTool !== "none") {
      setMapPanning(true);
    }
  }, [activeTool]);

  const handleMapPanEnd = useCallback(() => {
    setMapPanning(false);
  }, []);

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
