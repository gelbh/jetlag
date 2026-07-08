import { useEffect, useRef } from "react";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import type { AnnotationRecord } from "../../domain/map/annotations";
import type { AnnotationType, GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { DistanceUnit } from "../../domain/map/distance";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { MapTool } from "../../state/sessionStore";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
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
  sessionRules: SessionRulesInput;
  activeTool: MapTool;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
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
  ) => Promise<void | string | undefined>;
  sessionId?: string;
  senderUid?: string | null;
  onToolsChange: (tools: HeavyMapToolsApi) => void;
  canSubmitQuestion?: boolean;
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
  sessionRules,
  sessionId,
  senderUid,
  canSubmitQuestion,
  ...sharedProps
}: SharedToolProps & {
  onToolsChange: (tools: HeavyMapToolsApi) => void;
  canSubmitQuestion?: boolean;
}) {
  const matchingTool = useMatchingTool({
    active: true,
    pendingQuestions: sharedProps.pendingQuestions,
    sessionRules,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    canSubmitQuestion,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) =>
            submitToolQuestion("matching", input).then(() => undefined)
        : undefined,
  });

  usePublishHeavyTool("matching", matchingTool, onToolsChange);

  return null;
}

function MeasuringToolRunner({
  onToolsChange,
  awaitHiderAnswer,
  submitToolQuestion,
  sessionRules,
  sessionId,
  senderUid,
  canSubmitQuestion,
  ...sharedProps
}: SharedToolProps & {
  onToolsChange: (tools: HeavyMapToolsApi) => void;
  canSubmitQuestion?: boolean;
}) {
  const measuringTool = useMeasuringTool({
    active: true,
    pendingQuestions: sharedProps.pendingQuestions,
    sessionRules,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    canSubmitQuestion,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) =>
            submitToolQuestion("measuring", input).then(() => undefined)
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
  canSubmitQuestion,
  ...sharedProps
}: SharedToolProps & {
  onToolsChange: (tools: HeavyMapToolsApi) => void;
  canSubmitQuestion?: boolean;
}) {
  const tentacleTool = useTentacleTool({
    active: true,
    pendingQuestions: sharedProps.pendingQuestions,
    ...sharedProps,
    awaitHiderAnswer,
    sessionId,
    senderUid,
    canSubmitQuestion,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) =>
            submitToolQuestion("tentacle", input).then(() => undefined)
        : undefined,
  });

  usePublishHeavyTool("tentacle", tentacleTool, onToolsChange);

  return null;
}

export function HeavyMapToolsSlot({
  activeTool,
  onToolsChange,
  canSubmitQuestion,
  ...sharedProps
}: HeavyMapToolsSlotProps) {
  switch (activeTool) {
    case "matching":
      return (
        <MatchingToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    case "measuring":
      return (
        <MeasuringToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    case "tentacle":
      return (
        <TentacleToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    default:
      return null;
  }
}
