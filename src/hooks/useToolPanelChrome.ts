import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [mapPanning, setMapPanning] = useState(false);
  const [userMinimized, setUserMinimized] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setUserMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

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
