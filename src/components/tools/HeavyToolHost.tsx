import { useEffect, useRef } from "react";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import type { AnnotationRecord } from "../../domain/map/annotations";
import type { AnnotationType, GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { DistanceUnit } from "../../domain/map/distance";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import { useMatchingTool } from "../../hooks/tools/useMatchingTool";
import { useMeasuringTool } from "../../hooks/tools/useMeasuringTool";
import { useTentacleTool } from "../../hooks/tools/useTentacleTool";
import type { MapTool } from "../../state/sessionStore";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
  type MatchingToolApi,
  type MeasuringToolApi,
  type TentacleToolApi,
} from "../../hooks/map-screen/heavyMapTools";

export interface HeavyToolHostProps {
  activeTool: MapTool;
  sessionRules: SessionRulesInput;
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

type HeavyToolName = "matching" | "measuring" | "tentacle";

interface HeavyToolHookParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  sessionRules: SessionRulesInput;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
  mapError: string | null;
  gpsLoading: boolean;
  gpsError?: string | null;
  awaitingPlacement: boolean;
  setAwaitingPlacement: (awaiting: boolean) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  armPlacement: () => void;
  canSubmitQuestion?: boolean;
}

const HEAVY_TOOL_HOOKS: {
  [K in HeavyToolName]: (
    params: HeavyToolHookParams,
  ) => MatchingToolApi | MeasuringToolApi | TentacleToolApi;
} = {
  matching: useMatchingTool,
  measuring: useMeasuringTool,
  tentacle: useTentacleTool,
};

interface HeavyToolRunnerProps extends Omit<HeavyToolHostProps, "activeTool"> {
  toolName: HeavyToolName;
}

/** Must remount (via key) when toolName changes so the underlying hook stays stable. */
function HeavyToolRunner({
  toolName,
  onToolsChange,
  awaitHiderAnswer,
  submitToolQuestion,
  ...sharedProps
}: HeavyToolRunnerProps) {
  const useHeavyTool = HEAVY_TOOL_HOOKS[toolName];
  const tool = useHeavyTool({
    ...sharedProps,
    active: true,
    awaitHiderAnswer,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) => submitToolQuestion(toolName, input).then(() => undefined)
        : undefined,
  });

  usePublishHeavyTool(toolName, tool, onToolsChange);

  return null;
}

/** Mounts one heavy seeker tool at a time and publishes its API to the map controller. */
export function HeavyToolHost({ activeTool, ...sharedProps }: HeavyToolHostProps) {
  if (
    activeTool !== "matching" &&
    activeTool !== "measuring" &&
    activeTool !== "tentacle"
  ) {
    return null;
  }

  return (
    <HeavyToolRunner key={activeTool} toolName={activeTool} {...sharedProps} />
  );
}
