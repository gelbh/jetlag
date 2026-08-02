import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../../domain/map/mapTools";
import type { WizardSheetSnap } from "../../domain/wizard/phaseToSheetSnap";

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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setUserMinimized(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- phase snap; user expand sticks until snap flips */
    if (shouldAutoPeek) {
      setUserMinimized(true);
    } else {
      setUserMinimized(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [shouldAutoPeek]);

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
