import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [mapPanning, setMapPanning] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setPanelMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  const handleMapPanStart = useCallback(() => {
    if (activeTool !== "none") {
      setMapPanning(true);
      setPanelMinimized(true);
    }
  }, [activeTool]);

  const handleMapPanEnd = useCallback(() => {
    setMapPanning(false);
    setPanelMinimized(false);
  }, []);

  return {
    mapPanning,
    panelMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  };
}
