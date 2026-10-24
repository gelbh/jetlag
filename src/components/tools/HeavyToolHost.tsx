import { useEffect, useRef } from "react";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, AnnotationType, GameArea } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SessionMode } from "../../domain/session/castleSiege/mode";
import type { CastleSiegePlayingTeam } from "../../domain/session/castleSiege/pregame";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
  type MatchingToolApi,
  type MeasuringToolApi,
  type TentacleToolApi,
} from "../../hooks/map-screen/heavyMapTools";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import { useMatchingTool } from "../../hooks/tools/useMatchingTool";
import { useMeasuringTool } from "../../hooks/tools/useMeasuringTool";
import { useTentacleTool } from "../../hooks/tools/useTentacleTool";
import type { AnswerCastleSiegeOracleAskFn } from "../../services/session/castleSiegeOracleAsk";
import type { MapTool } from "../../state/sessionStore";

/** Flat heavy-tool host fields bag for HeavyToolHost (W4-F peel). */
export type HeavyToolHostModel = {
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
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<void | string | undefined>;
  sessionId?: string;
  senderUid?: string | null;
  onToolsChange: (tools: HeavyMapToolsApi) => void;
  canSubmitQuestion?: boolean;
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam | null;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
};

export type HeavyToolHostProps = {
  model: HeavyToolHostModel;
};

const idleTools = createIdleHeavyMapTools();

function heavyToolPublishKey(
  toolName: "matching" | "measuring" | "tentacle",
  tool: MatchingToolApi | MeasuringToolApi | TentacleToolApi,
): string {
  const base =
    "publishSignature" in tool
      ? `${toolName}:${tool.publishSignature}:${tool.placementCrosshair}`
      : `${toolName}:${JSON.stringify(tool.draft)}:${tool.placementCrosshair}`;

  if ("hud" in tool && tool.hud) {
    const r = tool.hud.readiness;
    return [
      base,
      r.placementReady,
      r.configureReady,
      r.resolveReady,
      r.answerReady,
      r.isSubmitting,
      r.awaitHiderAnswer,
      tool.hud.costLabel,
      tool.hud.error ?? "",
    ].join(":");
  }

  return base;
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
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
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
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam | null;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
}

type HeavyToolRunnerProps = Omit<HeavyToolHostModel, "activeTool">;

function heavyToolParams(
  toolName: HeavyToolName,
  {
    onToolsChange: _onToolsChange,
    awaitHiderAnswer,
    submitToolQuestion,
    ...sharedProps
  }: HeavyToolRunnerProps,
): HeavyToolHookParams {
  return {
    ...sharedProps,
    active: true,
    awaitHiderAnswer,
    submitPendingQuestion:
      awaitHiderAnswer && submitToolQuestion
        ? (input) => submitToolQuestion(toolName, input).then(() => undefined)
        : undefined,
  };
}

function MatchingToolRunner(props: HeavyToolRunnerProps) {
  const tool = useMatchingTool(heavyToolParams("matching", props));
  usePublishHeavyTool("matching", tool, props.onToolsChange);
  return null;
}

function MeasuringToolRunner(props: HeavyToolRunnerProps) {
  const tool = useMeasuringTool(heavyToolParams("measuring", props));
  usePublishHeavyTool("measuring", tool, props.onToolsChange);
  return null;
}

function TentacleToolRunner(props: HeavyToolRunnerProps) {
  const tool = useTentacleTool(heavyToolParams("tentacle", props));
  usePublishHeavyTool("tentacle", tool, props.onToolsChange);
  return null;
}

const HEAVY_TOOL_RUNNERS = {
  matching: MatchingToolRunner,
  measuring: MeasuringToolRunner,
  tentacle: TentacleToolRunner,
} satisfies Record<HeavyToolName, (props: HeavyToolRunnerProps) => null>;

/** Mounts one heavy seeker tool at a time and publishes its API to the map controller.
 * Tool hooks share the useToolSession open/submit/close machine; registry API is unchanged. */
export function HeavyToolHost({ model }: HeavyToolHostProps) {
  const { activeTool, ...sharedProps } = model;
  if (activeTool !== "matching" && activeTool !== "measuring" && activeTool !== "tentacle") {
    return null;
  }

  const Runner = HEAVY_TOOL_RUNNERS[activeTool];
  return <Runner key={activeTool} {...sharedProps} />;
}
