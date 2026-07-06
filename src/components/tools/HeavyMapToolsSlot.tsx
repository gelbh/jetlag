import { useEffect, useRef } from "react";
import type { AnnotationRecord } from "../../domain/annotations";
import type { AnnotationType, GameArea } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import type { DistanceUnit } from "../../domain/distance";
import type { MapTool } from "../../state/sessionStore";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
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
  awaitHiderAnswer?: boolean;
  submitToolQuestion?: (
    toolType: AnnotationType,
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  onToolsChange: (tools: HeavyMapToolsApi) => void;
}

type SharedToolProps = Omit<
  HeavyMapToolsSlotProps,
  "activeTool" | "onToolsChange"
>;

const idleTools = createIdleHeavyMapTools();

function heavyToolPublishKey(
  toolName: "matching" | "measuring" | "tentacle",
  tool: MatchingToolApi | MeasuringToolApi | TentacleToolApi,
): string {
  if ("publishSignature" in tool) {
    return `${toolName}:${tool.publishSignature}:${tool.placementCrosshair}`;
  }

  return `${toolName}:${JSON.stringify(tool.draft)}:${tool.placementCrosshair}`;
}

function usePublishHeavyTool(
  toolName: "matching" | "measuring" | "tentacle",
  tool: MatchingToolApi | MeasuringToolApi | TentacleToolApi,
  onToolsChange: (tools: HeavyMapToolsApi) => void,
) {
  const lastPublishKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const publishKey = heavyToolPublishKey(toolName, tool);
    if (publishKey === lastPublishKeyRef.current) {
      return;
    }

    lastPublishKeyRef.current = publishKey;

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
  awaitHiderAnswer,
  submitToolQuestion,
  sessionId,
  senderUid,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const matchingTool = useMatchingTool({
    active: true,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) => submitToolQuestion("matching", input)
        : undefined,
  });

  usePublishHeavyTool("matching", matchingTool, onToolsChange);

  return null;
}

function MeasuringToolRunner({
  onToolsChange,
  awaitHiderAnswer,
  submitToolQuestion,
  sessionId,
  senderUid,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const measuringTool = useMeasuringTool({
    active: true,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) => submitToolQuestion("measuring", input)
        : undefined,
  });

  usePublishHeavyTool("measuring", measuringTool, onToolsChange);

  return null;
}

function TentacleToolRunner({
  onToolsChange,
  awaitHiderAnswer,
  submitToolQuestion,
  sessionId,
  senderUid,
  ...sharedProps
}: SharedToolProps & { onToolsChange: (tools: HeavyMapToolsApi) => void }) {
  const tentacleTool = useTentacleTool({
    active: true,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) => submitToolQuestion("tentacle", input)
        : undefined,
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
