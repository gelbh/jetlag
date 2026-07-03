import { useEffect } from "react";
import type { AnnotationRecord } from "../../domain/annotations";
import type { GameArea } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import type { DistanceUnit } from "../../domain/distance";
import type { MapTool } from "../../state/sessionStore";
import { useMatchingTool } from "../../hooks/tools/useMatchingTool";
import { useMeasuringTool } from "../../hooks/tools/useMeasuringTool";
import { useTentacleTool } from "../../hooks/tools/useTentacleTool";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
  type MatchingToolApi,
  type MeasuringToolApi,
  type TentacleToolApi,
} from "../../hooks/map-screen/heavyMapTools";

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

type SharedToolProps = Omit<HeavyMapToolsSlotProps, "activeTool" | "onToolsChange">;

const idleTools = createIdleHeavyMapTools();

function usePublishHeavyTool(
  toolName: "matching" | "measuring" | "tentacle",
  tool: MatchingToolApi | MeasuringToolApi | TentacleToolApi,
  onToolsChange: (tools: HeavyMapToolsApi) => void,
) {
  useEffect(() => {
    const nextTools: HeavyMapToolsApi =
      toolName === "matching"
        ? {
            matchingTool: tool as MatchingToolApi,
            measuringTool: idleTools.measuringTool,
            tentacleTool: idleTools.tentacleTool,
          }
        : toolName === "measuring"
          ? {
              matchingTool: idleTools.matchingTool,
              measuringTool: tool as MeasuringToolApi,
              tentacleTool: idleTools.tentacleTool,
            }
          : {
              matchingTool: idleTools.matchingTool,
              measuringTool: idleTools.measuringTool,
              tentacleTool: tool as TentacleToolApi,
            };

    onToolsChange(nextTools);
  }, [onToolsChange, tool, toolName]);
}

function MatchingToolRunner({
  onToolsChange,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const matchingTool = useMatchingTool({
    active: true,
    ...sharedProps,
  });

  usePublishHeavyTool("matching", matchingTool, onToolsChange);

  return null;
}

function MeasuringToolRunner({
  onToolsChange,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const measuringTool = useMeasuringTool({
    active: true,
    ...sharedProps,
  });

  usePublishHeavyTool("measuring", measuringTool, onToolsChange);

  return null;
}

function TentacleToolRunner({
  onToolsChange,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const tentacleTool = useTentacleTool({
    active: true,
    ...sharedProps,
  });

  usePublishHeavyTool("tentacle", tentacleTool, onToolsChange);

  return null;
}

export function HeavyMapToolsSlot({
  activeTool,
  onToolsChange,
  ...sharedProps
}: HeavyMapToolsSlotProps) {
  switch (activeTool) {
    case "matching":
      return (
        <MatchingToolRunner onToolsChange={onToolsChange} {...sharedProps} />
      );
    case "measuring":
      return (
        <MeasuringToolRunner onToolsChange={onToolsChange} {...sharedProps} />
      );
    case "tentacle":
      return (
        <TentacleToolRunner onToolsChange={onToolsChange} {...sharedProps} />
      );
    default:
      return null;
  }
}
