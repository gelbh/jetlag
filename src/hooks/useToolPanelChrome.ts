import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [panelPeeked, setPanelPeeked] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setPanelPeeked(false);
    setPanelMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  const handleMapPanStart = useCallback(() => {
    if (activeTool !== "none") {
      setPanelPeeked(true);
    }
  }, [activeTool]);

  const handleMapPanEnd = useCallback(() => {
    setPanelPeeked(false);
  }, []);

  return {
    panelPeeked,
    panelMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  };
}
