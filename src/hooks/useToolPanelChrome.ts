import { useCallback, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [panelPeeked, setPanelPeeked] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [trackedTool, setTrackedTool] = useState(activeTool);

  if (trackedTool !== activeTool) {
    setTrackedTool(activeTool);
    setPanelPeeked(false);
    setPanelMinimized(false);
  }

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
