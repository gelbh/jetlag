import { useCallback, useMemo, useState } from "react";
import type { MapTool } from "../../state/sessionStore";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
} from "./heavyMapTools";

export function useHeavyMapToolsState(activeTool: MapTool) {
  const idleHeavyMapTools = useMemo(() => createIdleHeavyMapTools(), []);
  const [heavyMapTools, setHeavyMapTools] =
    useState<HeavyMapToolsApi>(idleHeavyMapTools);

  const heavyToolActive =
    activeTool === "matching" ||
    activeTool === "measuring" ||
    activeTool === "tentacle";

  const handleHeavyToolsChange = useCallback((tools: HeavyMapToolsApi) => {
    setHeavyMapTools(tools);
  }, []);

  const { matchingTool, measuringTool, tentacleTool } = heavyToolActive
    ? heavyMapTools
    : idleHeavyMapTools;

  return {
    heavyToolActive,
    handleHeavyToolsChange,
    matchingTool,
    measuringTool,
    tentacleTool,
  };
}
