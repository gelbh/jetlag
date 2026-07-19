import { useCallback, useMemo, useState } from "react";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { isPointInGameArea } from "../../domain/geometry/geometry";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
} from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import { hasOpenPendingQuestion } from "../../domain/questions";
import type {
  PendingQuestionRecord,
  PendingQuestionToolType,
} from "../../domain/session/sessionChat";
import { sessionHasHiders } from "../../domain/session/playerRole";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { useGeolocation } from "../location/useGeolocation";
import { usePendingQuestionActions } from "../sync/usePendingQuestionActions";
import { usePhotoTool } from "../tools/usePhotoTool";
import { usePinTool } from "../tools/usePinTool";
import { useRadarTool } from "../tools/useRadarTool";
import { useThermometerTool } from "../tools/useThermometerTool";
import { useZoneTool } from "../tools/useZoneTool";
import type { MapTool } from "../../state/sessionStore";
import { useHeavyMapToolsState } from "./useHeavyMapToolsState";

interface UseMapScreenToolsParams {
  session: SessionRecord | null;
  uid: string | null;
  activeTool: MapTool;
  setActiveTool: (tool: MapTool) => void;
  annotations: AnnotationRecord[];
  sessionRules: SessionRulesInput;
  gameArea: GameArea | null;
  toolGameArea: GameArea;
  pendingQuestions: readonly PendingQuestionRecord[];
  distanceUnit: DistanceUnit;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
}

/** Owns seeker tool state: GPS, placement, question submission, and the tool hooks. */
export function useMapScreenTools({
  session,
  uid,
  activeTool,
  setActiveTool,
  annotations,
  sessionRules,
  gameArea,
  toolGameArea,
  pendingQuestions,
  distanceUnit,
  createAnnotation,
}: UseMapScreenToolsParams) {
  const { refresh, loading: gpsLoading, error: gpsError } = useGeolocation();
  const [mapError, setMapError] = useState<string | null>(null);
  const [awaitingPlacement, setAwaitingPlacement] = useState(false);
  const awaitHiderAnswer = sessionHasHiders(session?.memberRoles);
  const canSubmitQuestion = !hasOpenPendingQuestion(pendingQuestions);
  const {
    submitPendingQuestion,
    answerPendingQuestion,
    completeThermometerWalk,
    postSystemMessage,
    cancelThermometerWalk,
  } = usePendingQuestionActions();

  const finishPlacement = useCallback(() => {
    setActiveTool("none");
    setAwaitingPlacement(false);
  }, [setActiveTool]);

  const ensurePointInGameArea = useCallback(
    (point: LatLngTuple) => {
      if (!gameArea || isPointInGameArea(point, gameArea)) {
        return true;
      }

      setMapError("That point is outside the play area.");
      return false;
    },
    [gameArea],
  );

  const armPlacement = useCallback(() => {
    setAwaitingPlacement(true);
    setMapError(null);
  }, []);

  const submitToolQuestion = useCallback(
    async (
      toolType: PendingQuestionToolType,
      input: Omit<
        Parameters<typeof submitPendingQuestion>[0],
        "sessionId" | "senderUid" | "senderRole" | "toolType"
      >,
    ) => {
      if (!session?.id || !uid) {
        return;
      }

      return submitPendingQuestion({
        ...input,
        sessionId: session.id,
        senderUid: uid,
        senderRole: "seeker",
        toolType,
      });
    },
    [session, submitPendingQuestion, uid],
  );

  const completeThermometerWalkForSession = useCallback(
    async (input: {
      pendingQuestionId: string;
      startPoint: LatLngTuple;
      endPoint: LatLngTuple;
      distanceMeters: number;
      promptText: string;
      replyOptions: { id: string; label: string }[];
      cardDraw?: number;
      cardKeep?: number;
    }) => {
      if (!session?.id || !uid) {
        return;
      }

      await completeThermometerWalk({
        sessionId: session.id,
        pendingQuestionId: input.pendingQuestionId,
        senderUid: uid,
        senderRole: "seeker",
        startPoint: input.startPoint,
        endPoint: input.endPoint,
        distanceMeters: input.distanceMeters,
        promptText: input.promptText,
        replyOptions: input.replyOptions,
        cardDraw: input.cardDraw,
        cardKeep: input.cardKeep,
      });
    },
    [completeThermometerWalk, session, uid],
  );

  const radarTool = useRadarTool({
    active: activeTool === "radar",
    annotations,
    gameSize: session?.gameSize ?? "medium",
    pendingQuestions,
    createAnnotation,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("radar", input).then(() => undefined)
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    senderRole: "seeker",
    distanceUnit,
    finishPlacement,
    setMapError,
    mapError,
    gpsLoading,
    gpsError,
    awaitingPlacement,
    setAwaitingPlacement,
    refreshGps: refresh,
    ensurePointInGameArea,
    armPlacement,
    canSubmitQuestion,
  });
  const photoTool = usePhotoTool({
    active: activeTool === "photo",
    gameSize: session?.gameSize ?? "medium",
    pendingQuestions,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("photo", input).then(() => undefined)
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    finishPlacement,
    setMapError,
    mapError,
    canSubmitQuestion,
  });
  const thermometerTool = useThermometerTool({
    active: activeTool === "thermometer",
    annotations,
    sessionRules,
    pendingQuestions,
    canSubmitQuestion,
    createAnnotation,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("thermometer", input)
      : undefined,
    completeThermometerWalk: awaitHiderAnswer
      ? completeThermometerWalkForSession
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    distanceUnit,
    finishPlacement,
    setMapError,
    gpsLoading,
    gpsError,
    refreshGps: refresh,
    ensurePointInGameArea,
  });
  const {
    heavyToolActive,
    handleHeavyToolsChange,
    matchingTool,
    measuringTool,
    tentacleTool,
  } = useHeavyMapToolsState(activeTool);
  const pinTool = usePinTool({
    active: activeTool === "pin",
    createAnnotation,
    finishPlacement,
  });
  const zoneTool = useZoneTool({
    active: activeTool === "zone",
    createAnnotation,
    finishPlacement,
  });

  const resetToolDrafts = useCallback(() => {
    measuringTool.resetDraft();
    matchingTool.resetDraft();
    thermometerTool.resetDraft();
    radarTool.resetDraft();
    tentacleTool.resetDraft();
    pinTool.resetDraft();
    zoneTool.resetDraft();
  }, [
    matchingTool,
    measuringTool,
    pinTool,
    radarTool,
    tentacleTool,
    thermometerTool,
    zoneTool,
  ]);

  const placementCrosshair =
    zoneTool.placementCrosshair ||
    awaitingPlacement ||
    pinTool.placementCrosshair ||
    radarTool.placementCrosshair ||
    thermometerTool.placementCrosshair ||
    matchingTool.placementCrosshair ||
    measuringTool.placementCrosshair ||
    tentacleTool.placementCrosshair;

  const measuringPlacePoints = useMemo(
    () => measuringTool.draft.measuringPlaces.map((place) => place.point),
    [measuringTool.draft.measuringPlaces],
  );

  const heavyMapToolsSlotProps = {
    activeTool,
    sessionRules,
    annotations,
    pendingQuestions,
    gameArea: toolGameArea,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    gpsLoading,
    gpsError,
    mapError,
    setMapError,
    refreshGps: refresh,
    ensurePointInGameArea,
    awaitingPlacement,
    setAwaitingPlacement,
    armPlacement,
    awaitHiderAnswer,
    submitToolQuestion,
    sessionId: session?.id,
    senderUid: uid,
    canSubmitQuestion,
    onToolsChange: handleHeavyToolsChange,
  };

  return {
    gpsLoading,
    gpsError,
    refreshGps: refresh,
    mapError,
    setMapError,
    awaitingPlacement,
    setAwaitingPlacement,
    armPlacement,
    finishPlacement,
    ensurePointInGameArea,
    awaitHiderAnswer,
    canSubmitQuestion,
    submitToolQuestion,
    answerPendingQuestion,
    postSystemMessage,
    cancelThermometerWalk,
    radarTool,
    photoTool,
    thermometerTool,
    pinTool,
    zoneTool,
    matchingTool,
    measuringTool,
    tentacleTool,
    heavyToolActive,
    resetToolDrafts,
    placementCrosshair,
    measuringPlacePoints,
    heavyMapToolsSlotProps,
  };
}
