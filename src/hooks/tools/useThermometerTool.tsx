import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThermometerHudBody } from "../../components/tools/ask/thermometer/ThermometerHudBody";
import { ThermometerMapPlacementChrome } from "../../components/tools/ask/thermometer/ThermometerMapPlacementChrome";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { distanceBetweenPoints } from "../../domain/geometry/gameArea/geometry";
import { isActive } from "../../domain/map/annotations";
import { formatPresetDistance } from "../../domain/map/distance";
import {
  availableThermometerDistancePresetsForSession,
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  firstAvailableThermometerDistanceMetersForSession,
  isThermometerDistanceOptionAvailable,
  isThermometerDistanceOptionAvailableForSession,
  isThermometerWalkActive,
  parseThermometerStartPoint,
  questionCostBreakdown,
  type ThermometerDistanceOptionMiles,
  thermometerPresetMilesForMeters,
  thermometerQuestionPrompt,
  thermometerSendBlockReason,
  thermometerUseCount,
  thermometerUseCountFromPending,
  usedThermometerDistanceOptionsForSession,
} from "../../domain/questions";
import { useLiveLocation } from "../location/useLiveLocation";
import type { AskToolHudBundle } from "../map-screen/heavyMapTools";
import { useToolSession } from "./framework/useToolSession";
import { commitThermometerManual } from "./thermometer/commitThermometer";
import { completeThermometerWalkStep } from "./thermometer/completeThermometerWalk";
import { startThermometerGpsWalk } from "./thermometer/startThermometerWalk";
import type { ThermometerSessionConfig, UseThermometerToolParams } from "./thermometer/types";
import { useThermometerSendBlockedTracking } from "./thermometer/useThermometerSendBlockedTracking";
import { useThermometerWalk } from "./useThermometerWalk";

export type { UseThermometerToolParams } from "./thermometer/types";

function createThermometerConfig(
  sessionRules: UseThermometerToolParams["sessionRules"],
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles> = new Set(),
): ThermometerSessionConfig {
  return {
    placementMode: "gps",
    localThermoA: null,
    thermoB: null,
    localWalkingQuestionId: null,
    distanceMeters:
      firstAvailableThermometerDistanceMetersForSession(sessionRules, usedOptions) ??
      availableThermometerDistancePresetsForSession(sessionRules)[0] ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
    answer: null,
    panelError: null,
  };
}

/** A picked preset that has since been used falls through to the first unused one. */
function unusedThermometerDistanceMeters(
  distanceMeters: number,
  sessionRules: UseThermometerToolParams["sessionRules"],
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles>,
): number {
  const miles = thermometerPresetMilesForMeters(distanceMeters);
  if (miles === null || !usedOptions.has(miles)) {
    return distanceMeters;
  }
  return (
    firstAvailableThermometerDistanceMetersForSession(sessionRules, usedOptions) ?? distanceMeters
  );
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
  const wizardStepRef = useRef("place");
  const [editingSetup, setEditingSetup] = useState(true);
  const finishPlacementRef = useRef(finishPlacement);
  const resetAfterSuccessRef = useRef(() => undefined as void);
  const reportErrorRef = useRef(setMapError);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const activeAnnotations = useMemo(() => annotations.filter(isActive), [annotations]);

  const syncedWalkingQuestion = useMemo(
    () =>
      pendingQuestions.find(
        (question) =>
          isThermometerWalkActive(question) && (!senderUid || question.createdByUid === senderUid),
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

    const distanceMeters = syncedWalkingQuestion.placement.metadata?.thermometerDistanceMeters;

    return {
      questionId: syncedWalkingQuestion.id,
      startPoint: start,
      distanceMeters: typeof distanceMeters === "number" ? distanceMeters : null,
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

  const usedThermometerOptions = useMemo(
    () =>
      usedThermometerDistanceOptionsForSession(
        activeAnnotations,
        pendingQuestions,
        undefined,
        // The live walk must not mark its own distance as used, or END WALK never arms.
        syncedWalkingQuestion?.id,
      ),
    [activeAnnotations, pendingQuestions, syncedWalkingQuestion?.id],
  );
  const usedThermometerOptionsRef = useRef(usedThermometerOptions);
  useEffect(() => {
    usedThermometerOptionsRef.current = usedThermometerOptions;
  }, [usedThermometerOptions]);

  const createInitialConfig = useCallback(
    () => createThermometerConfig(sessionRules, usedThermometerOptions),
    [sessionRules, usedThermometerOptions],
  );

  const session = useToolSession<ThermometerSessionConfig>({
    toolId: "thermometer",
    createInitialConfig,
    onSubmit: async (config) => {
      const synced = syncedWalkDraftRef.current;
      const walkingQuestionId = config.localWalkingQuestionId ?? synced?.questionId ?? null;
      const thermoA =
        config.localThermoA ??
        (synced && walkingQuestionId === synced.questionId ? synced.startPoint : null);
      const distanceMeters =
        config.localWalkingQuestionId === null &&
        synced &&
        walkingQuestionId === synced.questionId &&
        synced.distanceMeters !== null
          ? synced.distanceMeters
          : unusedThermometerDistanceMeters(
              config.distanceMeters,
              sessionRules,
              usedThermometerOptionsRef.current,
            );

      if (!thermoA || !config.thermoB) {
        return;
      }

      const travelMeters = distanceBetweenPoints(thermoA, config.thermoB);
      const useCount = Math.max(
        thermometerUseCount(activeAnnotationsRef.current, distanceMeters),
        thermometerUseCountFromPending(pendingQuestionsRef.current, distanceMeters),
      );
      const { draw: cardDraw, keep: cardKeep } = questionCostBreakdown("D2P1", useCount);

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
        usedThermometerOptions: usedThermometerOptionsRef.current,
        createAnnotation,
        setMapError: (message) => reportErrorRef.current(message),
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

  // Light tools do not render mapError; mirror into panelError so the overlay shows it.
  const reportError = useCallback(
    (message: string | null) => {
      setMapError(message);
      patchConfig({ panelError: message });
    },
    [patchConfig, setMapError],
  );
  useEffect(() => {
    reportErrorRef.current = reportError;
  }, [reportError]);

  const walkingQuestionId = config.localWalkingQuestionId ?? syncedWalkDraft?.questionId ?? null;
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
      : unusedThermometerDistanceMeters(
          config.distanceMeters,
          sessionRules,
          usedThermometerOptions,
        );

  const { reading: gpsReading } = useLiveLocation(active && config.placementMode === "gps", {
    highAccuracy: true,
  });

  const thermoStep: "a" | "b" | "ready" | "walking" = walkingQuestionId
    ? "walking"
    : !thermoA
      ? "a"
      : !config.thermoB
        ? "b"
        : "ready";

  const thermoTravelMeters =
    thermoA && config.thermoB ? distanceBetweenPoints(thermoA, config.thermoB) : null;

  const presetUseCount = Math.max(
    thermometerUseCount(activeAnnotations, activeDistanceMeters),
    thermometerUseCountFromPending(pendingQuestions, activeDistanceMeters),
  );
  const {
    label: costLabel,
    draw: cardDraw,
    keep: cardKeep,
  } = questionCostBreakdown("D2P1", presetUseCount);

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
    onError: reportError,
  });

  const resetDraft = useCallback(() => {
    setEditingSetup(true);
    walkTracker.cancelWalk();
    openSession();
  }, [openSession, walkTracker]);

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
      usedThermometerOptions,
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
    usedThermometerOptions,
  ]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || config.placementMode !== "manual" || wizardStepRef.current !== "place") {
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

  const walkingActive = thermoStep === "walking";
  const pinsReady = thermoStep === "ready";
  const distanceAvailableForSession = isThermometerDistanceOptionAvailableForSession(
    sessionRules,
    activeDistanceMeters,
  );
  const distanceUnused = isThermometerDistanceOptionAvailable(
    usedThermometerOptions,
    activeDistanceMeters,
  );
  const distanceAvailable = distanceAvailableForSession && distanceUnused;
  const liveTravelMeters = walkTracker.distanceTraveledMeters ?? thermoTravelMeters;
  const travelTooShort = liveTravelMeters !== null && liveTravelMeters + 1 < activeDistanceMeters;
  // While walking, END WALK arms only after a GPS sample (non-null travel).
  // Before walk / after walk, keep distance + short-travel gates.
  const configureReady = walkingActive
    ? distanceAvailable && liveTravelMeters !== null
    : distanceAvailable && !travelTooShort;
  const sendBlockReason = thermometerSendBlockReason({
    walkingActive,
    canSubmitQuestion,
    distanceAvailableForSession,
    distanceUnused,
    travelTooShort,
    liveTravelMeters,
  });

  // Drive map-click routing without mounting ThermometerPanel wizard.
  useEffect(() => {
    if (walkingActive) {
      wizardStepRef.current = "place";
      return;
    }
    if (!thermoA || (config.placementMode === "manual" && !config.thermoB)) {
      wizardStepRef.current = "place";
      return;
    }
    wizardStepRef.current = "ask";
  }, [config.placementMode, config.thermoB, thermoA, walkingActive]);

  const readiness: AskHudReadiness = {
    surface: "thermometer",
    placementReady: walkingActive || (config.placementMode === "manual" ? pinsReady : true),
    configureReady,
    resolveReady: walkingActive || pinsReady,
    answerReady: walkingActive || awaitHiderAnswer || config.answer !== null,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    // Our own walk is the open question; it must stay endable.
    viewOnly: !canSubmitQuestion && !walkingActive,
  };

  const onHudCommit = () => {
    if (walkingActive) {
      walkTracker.endWalk();
      return;
    }
    void commit();
  };

  /**
   * Manual: leave the sheet after mode/distance so pins can be tapped on the map.
   * GPS setup + live walk stay on the sheet; answer chrome only once pins exist.
   */
  /** After distance pick: map for GPS start or manual pins (Matching/Radar twin). */
  const mapFirstEligible = !walkingActive && !editingSetup;
  const mapPlacementActive = Boolean(mapFirstEligible);

  const travelLabel =
    liveTravelMeters !== null ? formatPresetDistance(liveTravelMeters, distanceUnit) : null;
  const distanceLabel = formatPresetDistance(activeDistanceMeters, distanceUnit);

  const canCommitThermo =
    configureReady &&
    pinsReady &&
    canSubmitQuestion &&
    !session.isBusy &&
    (awaitHiderAnswer || config.answer !== null);

  const placementError = config.panelError ?? session.error ?? gpsError ?? walkTracker.gpsError;

  // Count blocks only where a commit control is on screen: End walk, Start track, or Send.
  const commitControlVisible =
    walkingActive ||
    (mapPlacementActive &&
      (pinsReady ? awaitHiderAnswer || config.answer !== null : config.placementMode === "gps"));

  useThermometerSendBlockedTracking({
    active,
    reason: commitControlVisible ? sendBlockReason : null,
    placementMode: config.placementMode,
    awaitHiderAnswer,
  });

  const reopenSetup = () => {
    setEditingSetup(true);
    patchConfig({ localThermoA: null, thermoB: null, answer: null });
  };

  const setPlacementMode = (placementMode: ThermometerSessionConfig["placementMode"]) => {
    patchConfig({ placementMode });
  };

  const setDistanceMeters = (distanceMeters: number) => {
    patchConfig({ distanceMeters });
    setEditingSetup(false);
  };

  const hud: AskToolHudBundle = {
    readiness,
    costLabel,
    error: mapPlacementActive ? null : placementError,
    onCommit: onHudCommit,
    commitKind: walkingActive ? "endWalk" : awaitHiderAnswer ? "send" : "ask",
    suppressSheet: mapPlacementActive,
    mapOverlay: mapPlacementActive ? (
      <ThermometerMapPlacementChrome
        distanceLabel={distanceLabel}
        questionPrompt={thermometerQuestionPrompt(activeDistanceMeters, distanceUnit)}
        costLabel={costLabel}
        pinStep={thermoStep === "walking" ? "b" : thermoStep === "ready" ? "ready" : thermoStep}
        placementMode={config.placementMode}
        onPlacementModeChange={setPlacementMode}
        onStartWalk={startWalkLocked}
        gpsLoading={gpsLoading}
        canStartWalk={distanceAvailable && canSubmitQuestion && !session.isBusy}
        travelLabel={travelLabel}
        blockReason={sendBlockReason}
        error={placementError}
        awaitHiderAnswer={awaitHiderAnswer}
        answer={config.answer}
        onAnswerChange={(answer) => patchConfig({ answer })}
        canCommit={canCommitThermo}
        isSubmitting={session.isBusy}
        onCommit={() => void commit()}
        onChangeSetup={reopenSetup}
      />
    ) : null,
    modeBody: mapPlacementActive ? null : (
      <ThermometerHudBody
        distanceUnit={distanceUnit}
        sessionRules={sessionRules}
        distanceMeters={activeDistanceMeters}
        travelMeters={walkTracker.distanceTraveledMeters ?? thermoTravelMeters}
        answer={config.answer}
        step={thermoStep === "walking" ? "b" : thermoStep}
        placementMode={config.placementMode}
        walkingActive={walkingActive}
        waitingForGps={walkingActive && sendBlockReason === "gps_waiting"}
        presetUseCount={presetUseCount}
        usedDistanceOptions={usedThermometerOptions}
        costLabel={costLabel}
        gpsLoading={gpsLoading}
        canSubmitQuestion={canSubmitQuestion}
        isSubmitting={session.isBusy}
        error={placementError}
        onPlacementModeChange={setPlacementMode}
        onDistanceChange={setDistanceMeters}
        onAnswerChange={(answer) => patchConfig({ answer })}
        onReset={resetDraft}
        onStartWalk={startWalkLocked}
        awaitHiderAnswer={awaitHiderAnswer}
        toolLabel="Thermometer"
      />
    ),
    sheets: null as ReactNode,
  };

  return {
    draft: {
      thermoA,
      thermoB: config.thermoB,
      thermometerAnswer: config.answer,
      thermometerDistanceMeters: activeDistanceMeters,
      walkingQuestionId,
    },
    placementCrosshair: active && config.placementMode === "manual" && thermoStep !== "ready",
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
        usedDistanceOptions={usedThermometerOptions}
        costLabel={costLabel}
        placementMode={config.placementMode}
        walkingActive={thermoStep === "walking"}
        onPlacementModeChange={setPlacementMode}
        onDistanceChange={setDistanceMeters}
        onAnswerChange={(answer) => patchConfig({ answer })}
        onReset={resetDraft}
        onStartWalk={startWalkLocked}
        onCommit={commit}
        awaitHiderAnswer={awaitHiderAnswer}
        canSubmitQuestion={canSubmitQuestion}
        isSubmitting={session.isBusy}
        gpsLoading={gpsLoading}
        error={placementError}
        wizardStepRef={wizardStepRef}
      />
    ),
    hud,
    walkCurrentPoint: walkTracker.currentPoint,
  };
}
