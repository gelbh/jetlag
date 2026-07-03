import { useEffect } from "react";
import type { AnnotationRecord } from "../../domain/annotations";
import type { GameArea } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import type { DistanceUnit } from "../../domain/distance";
import type { MapTool } from "../../state/sessionStore";
import { useMatchingTool } from "../../hooks/tools/useMatchingTool";
import { useMeasuringTool } from "../../hooks/tools/useMeasuringTool";
import { useTentacleTool } from "../../hooks/tools/useTentacleTool";
import type { HeavyMapToolsApi } from "../../hooks/map-screen/heavyMapTools";

interface HeavyMapToolsSlotProps {
  activeTool: MapTool;
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  setMapError: (error: string | null) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  awaitingPlacement: boolean;
  setAwaitingPlacement: (awaiting: boolean) => void;
  armPlacement: () => void;
  onToolsChange: (tools: HeavyMapToolsApi) => void;
}

export function HeavyMapToolsSlot({
  activeTool,
  onToolsChange,
  ...sharedProps
}: HeavyMapToolsSlotProps) {
  const matchingTool = useMatchingTool({
    active: activeTool === "matching",
    ...sharedProps,
  });
  const measuringTool = useMeasuringTool({
    active: activeTool === "measuring",
    ...sharedProps,
  });
  const tentacleTool = useTentacleTool({
    active: activeTool === "tentacle",
    ...sharedProps,
  });

  useEffect(() => {
    onToolsChange({ matchingTool, measuringTool, tentacleTool });
  }, [matchingTool, measuringTool, onToolsChange, tentacleTool]);

  return null;
}
