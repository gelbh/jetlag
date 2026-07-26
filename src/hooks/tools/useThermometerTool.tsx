import { useCallback, useEffect, useMemo, useRef } from "react";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { distanceBetweenPoints } from "../../domain/geometry/geometry";
import { isActive } from "../../domain/map/annotations";
import {
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  availableThermometerDistancePresetsForSession,
  isThermometerWalkActive,
  parseThermometerStartPoint,
  questionCostBreakdown,
  thermometerUseCount,
  thermometerUseCountFromPending,
} from "../../domain/questions";
import { useLiveLocation } from "../location/useLiveLocation";
import { useThermometerWalk } from "./useThermometerWalk";
import { useToolSession } from "./framework/useToolSession";
import { commitThermometerManual } from "./thermometer/commitThermometer";
import { completeThermometerWalkStep } from "./thermometer/completeThermometerWalk";
import { startThermometerGpsWalk } from "./thermometer/startThermometerWalk";
import type {
  ThermometerSessionConfig,
  UseThermometerToolParams,
} from "./thermometer/types";

export type { UseThermometerToolParams } from "./thermometer/types";

function createThermometerConfig(
  sessionRules: UseThermometerToolParams["sessionRules"],
): ThermometerSessionConfig {
  return {
    placementMode: "gps",
    localThermoA: null,
    thermoB: null,
    localWalkingQuestionId: null,
    distanceMeters:
      availableThermometerDistancePresetsForSession(sessionRules)[0] ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
    answer: null,
    panelError: null,
  };
}

export function useThermometerTool({
  active,
  annotations,
  sessionRules,
  pendingQuestions = [],
  canSubmitQuestion = true,
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  completeThermometerWalk,
  sessionId,
  senderUid,
  distanceUnit,
  finishPlacement,
  setMapError,
  gpsLoading = false,
  gpsError = null,
  refreshGps,
  ensurePointInGameArea,
}: UseThermometerToolParams) {
  const wizardStepRef = useRef("distance");
  const finishPlacementRef = useRef(finishPlacement);
  const resetAfterSuccessRef = useRef(() => undefined as void);

  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );

  const syncedWalkingQuestion = useMemo(
    () =>
      pendingQuestions.find(
        (question) =>
          isThermometerWalkActive(question) &&
          (!senderUid || question.createdByUid === senderUid),
      ) ?? null,
    [pendingQuestions, senderUid],
  );

  const syncedWalkDraft = useMemo(() => {
    if (!syncedWalkingQuestion) {
      return null;
    }

    const start = parseThermometerStartPoint(syncedWalkingQuestion.placement);
    if (!start) {
      return null;
    }

    const distanceMeters =
      syncedWalkingQuestion.placement.metadata?.thermometerDistanceMeters;

    return {
      questionId: syncedWalkingQuestion.id,
      startPoint: start,
      distanceMeters:
        typeof distanceMeters === "number" ? distanceMeters : null,
    };
  }, [syncedWalkingQuestion]);

  const syncedWalkDraftRef = useRef(syncedWalkDraft);
  const activeAnnotationsRef = useRef(activeAnnotations);
  const pendingQuestionsRef = useRef(pendingQuestions);

  useEffect(() => {
    syncedWalkDraftRef.current = syncedWalkDraft;
  }, [syncedWalkDraft]);

  useEffect(() => {
    activeAnnotationsRef.current = activeAnnotations;
  }, [activeAnnotations]);

  useEffect(() => {
    pendingQuestionsRef.current = pendingQuestions;
  }, [pendingQuestions]);

  const createInitialConfig = useCallback(
    () => createThermometerConfig(sessionRules),
    [sessionRules],
  );

  const session = useToolSession<ThermometerSessionConfig>({
    toolId: "thermometer",
    active,
    createInitialConfig,
    onSubmit: async (config) => {
      const synced = syncedWalkDraftRef.current;
      const walkingQuestionId =
        config.localWalkingQuestionId ?? synced?.questionId ?? null;
      const thermoA =
        config.localThermoA ??
        (synced && walkingQuestionId === synced.questionId
          ? synced.startPoint
          : null);
      const distanceMeters =
        config.localWalkingQuestionId === null &&
        synced &&
        walkingQuestionId === synced.questionId &&
        synced.distanceMeters !== null
          ? synced.distanceMeters
          : config.distanceMeters;

      if (!thermoA || !config.thermoB) {
        return;
      }

      const travelMeters = distanceBetweenPoints(thermoA, config.thermoB);
      const useCount = Math.max(
        thermometerUseCount(activeAnnotationsRef.current, distanceMeters),
        thermometerUseCountFromPending(
          pendingQuestionsRef.current,
          distanceMeters,
        ),
      );
      const { draw: cardDraw, keep: cardKeep } = questionCostBreakdown(
        "D2P1",
        useCount,
      );

      await commitThermometerManual({
        thermoA,
        thermoB: config.thermoB,
        thermoTravelMeters: travelMeters,
        distanceMeters,
        answer: config.answer,
        pendingQuestions: pendingQuestionsRef.current,
        awaitHiderAnswer,
        submitPendingQuestion,
        sessionId,
        senderUid,
        distanceUnit,
        cardDraw,
        cardKeep,
        createAnnotation,
        setMapError,
        onSuccess: () => {
          resetAfterSuccessRef.current();
          finishPlacementRef.current();
        },
      });
    },
  });

  const openSession = session.open;
  useEffect(() => {
    resetAfterSuccessRef.current = openSession;
  }, [openSession]);

  const config = session.config ?? createInitialConfig();
  const patchConfig = session.setConfig;

  const walkingQuestionId =
    config.localWalkingQuestionId ?? syncedWalkDraft?.questionId ?? null;
  const thermoA =
    config.localThermoA ??
    (syncedWalkDraft && walkingQuestionId === syncedWalkDraft.questionId
      ? syncedWalkDraft.startPoint
      : null);
  const activeDistanceMeters =
    config.localWalkingQuestionId === null &&
    syncedWalkDraft &&
    walkingQuestionId === syncedWalkDraft.questionId &&
    syncedWalkDraft.distanceMeters !== null
      ? syncedWalkDraft.distanceMeters
      : config.distanceMeters;

  const { reading: gpsReading } = useLiveLocation(
    active && config.placementMode === "gps",
    { highAccuracy: true },
  );

  const thermoStep: "a" | "b" | "ready" | "walking" = walkingQuestionId
    ? "walking"
    : !thermoA
      ? "a"
      : !config.thermoB
        ? "b"
        : "ready";

  const thermoTravelMeters =
    thermoA && config.thermoB
      ? distanceBetweenPoints(thermoA, config.thermoB)
      : null;

  const presetUseCount = Math.max(
    thermometerUseCount(activeAnnotations, activeDistanceMeters),
    thermometerUseCountFromPending(pendingQuestions, activeDistanceMeters),
  );
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D2P1", presetUseCount);

  const handleWalkComplete = useCallback(
    async (endPoint: LatLngTuple) => {
      if (!thermoA || !walkingQuestionId) {
        return;
      }

      await completeThermometerWalkStep({
        endPoint,
        thermoA,
        walkingQuestionId,
        distanceMeters: activeDistanceMeters,
        distanceUnit,
        sessionId,
        senderUid,
        cardDraw,
        cardKeep,
        completeThermometerWalk,
        patchConfig,
        onRemoteSuccess: () => finishPlacementRef.current(),
      });
    },
    [
      activeDistanceMeters,
      cardDraw,
      cardKeep,
      completeThermometerWalk,
      distanceUnit,
      patchConfig,
      senderUid,
      sessionId,
      thermoA,
      walkingQuestionId,
    ],
  );

  const walkTracker = useThermometerWalk({
    active: walkingQuestionId !== null && thermoA !== null,
    startPoint: thermoA,
    targetDistanceMeters: activeDistanceMeters,
    onAutoStop: handleWalkComplete,
    onError: setMapError,
  });

  const resetDraft = useCallback(() => {
    walkTracker.cancelWalk();
    session.open();
  }, [session.open, walkTracker]);

  const startGpsWalk = useCallback(async () => {
    await startThermometerGpsWalk({
      config,
      canSubmitQuestion,
      pendingQuestions,
      sessionRules,
      gpsReading,
      refreshGps,
      ensurePointInGameArea,
      awaitHiderAnswer,
      submitPendingQuestion,
      sessionId,
      senderUid,
      distanceUnit,
      distanceMeters: activeDistanceMeters,
      setMapError,
      patchConfig,
    });
  }, [
    activeDistanceMeters,
    awaitHiderAnswer,
    canSubmitQuestion,
    config,
    distanceUnit,
    ensurePointInGameArea,
    gpsReading,
    patchConfig,
    pendingQuestions,
    refreshGps,
    senderUid,
    sessionId,
    sessionRules,
    setMapError,
    submitPendingQuestion,
  ]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || config.placementMode !== "manual") {
        return false;
      }

      if (!thermoA) {
        patchConfig({ localThermoA: point });
      } else if (!config.thermoB) {
        patchConfig({ thermoB: point });
      }

      return true;
    },
    [active, config.placementMode, config.thermoB, patchConfig, thermoA],
  );

  const commit = () => session.submit();

  const startWalkLocked = () => {
    void session.runAction(async () => {
      await startGpsWalk();
    });
  };

  return {
    draft: {
      thermoA,
      thermoB: config.thermoB,
      thermometerAnswer: config.answer,
      thermometerDistanceMeters: activeDistanceMeters,
      walkingQuestionId,
    },
    placementCrosshair:
      active && config.placementMode === "manual" && thermoStep !== "ready",
    handleMapClick,
    resetDraft,
    commit,
    panel: (
      <ThermometerPanel
        distanceUnit={distanceUnit}
        sessionRules={sessionRules}
        distanceMeters={activeDistanceMeters}
        travelMeters={walkTracker.distanceTraveledMeters ?? thermoTravelMeters}
        answer={config.answer}
        step={thermoStep === "walking" ? "b" : thermoStep}
        presetUseCount={presetUseCount}
        costLabel={costLabel}
        placementMode={config.placementMode}
        walkingActive={thermoStep === "walking"}
        onPlacementModeChange={(placementMode) =>
          patchConfig({ placementMode })
        }
        onDistanceChange={(distanceMeters) => patchConfig({ distanceMeters })}
        onAnswerChange={(answer) => patchConfig({ answer })}
        onReset={resetDraft}
        onStartWalk={startWalkLocked}
        onCommit={commit}
        awaitHiderAnswer={awaitHiderAnswer}
        canSubmitQuestion={canSubmitQuestion}
        isSubmitting={session.isBusy}
        gpsLoading={gpsLoading}
        error={
          config.panelError ?? session.error ?? gpsError ?? walkTracker.gpsError
        }
        wizardStepRef={wizardStepRef}
      />
    ),
    walkCurrentPoint: walkTracker.currentPoint,
  };
}
