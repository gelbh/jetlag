import { useCallback, useEffect, useState } from "react";
import type { DockableMapTool } from "../domain/map/mapTools";
import { isWizardPlacementStep } from "../components/tools/shared/toolWizardPlacementSteps";
import { WIZARD_STEP_CHANGE_EVENT } from "./tools/useSyncWizardStepRef";

export function useToolPanelChrome(activeTool: DockableMapTool | "none") {
  const [mapPanning, setMapPanning] = useState(false);
  const [userMinimized, setUserMinimized] = useState(false);
  const [wizardStepId, setWizardStepId] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset panel chrome when the active tool changes */
    setMapPanning(false);
    setUserMinimized(false);
    setWizardStepId(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTool]);

  useEffect(() => {
    const handleStepChange = (event: Event) => {
      const detail = (event as CustomEvent<{ stepId: string }>).detail;
      setWizardStepId(detail.stepId);
    };

    window.addEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
    return () => {
      window.removeEventListener(WIZARD_STEP_CHANGE_EVENT, handleStepChange);
    };
  }, []);

  const placementStepMinimized =
    activeTool !== "none" &&
    wizardStepId !== null &&
    isWizardPlacementStep(wizardStepId);
  const effectiveUserMinimized = userMinimized || placementStepMinimized;

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
    panelMinimized: effectiveUserMinimized || mapPanning,
    userMinimized: effectiveUserMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  };
}
