import { useCallback, useMemo, useState } from "react";
import type { Feature, LineString } from "geojson";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import type { LatLngTuple } from "../../domain/geometry";
import { distanceBetweenPoints } from "../../domain/geometry";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { sessionGameSize } from "../../domain/sessionRules";
import { hasOpenPendingQuestion, questionCostBreakdown } from "../../domain/questionRules";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import {
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  availableThermometerDistancePresetsForSession,
  isThermometerDistanceOptionAvailableForSession,
  thermometerHotterTowards,
  thermometerQuestionPrompt,
  thermometerUseCount,
  thermometerUseCountFromPending,
  type ThermometerAnswer,
} from "../../domain/thermometerQuestions";
import type { DistanceUnit } from "../../domain/distance";
import { hotterColderAnswerOptions } from "../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
import { useSubmitLock } from "../useSubmitLock";
import { useLiveLocation } from "../useLiveLocation";
import {
  parseThermometerStartPoint,
  isThermometerWalkActive,
} from "../../domain/thermometerWalk";
import {
  thermometerWalkStartPlacement,
  useThermometerWalk,
} from "./useThermometerWalk";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

type PlacementMode = "gps" | "manual";

interface UseThermometerToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  sessionRules: SessionRulesInput;
  pendingQuestions?: readonly PendingQuestionRecord[];
  canSubmitQuestion?: boolean;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<string | void>;
  completeThermometerWalk?: (input: {
    pendingQuestionId: string;
    startPoint: LatLngTuple;
    endPoint: LatLngTuple;
    distanceMeters: number;
    promptText: string;
    replyOptions: { id: string; label: string }[];
    cardDraw?: number;
    cardKeep?: number;
  }) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  setMapError: (message: string | null) => void;
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
}: UseThermometerToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
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

  const [placementMode, setPlacementMode] = useState<PlacementMode>("gps");
  const [localThermoA, setLocalThermoA] = useState<LatLngTuple | null>(null);
  const [thermoB, setThermoB] = useState<LatLngTuple | null>(null);
  const [localWalkingQuestionId, setLocalWalkingQuestionId] = useState<
    string | null
  >(null);
  const [thermometerDistanceMeters, setThermometerDistanceMeters] = useState(
    () =>
      availableThermometerDistancePresetsForSession(sessionRules)[0] ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [thermometerAnswer, setThermometerAnswer] =
    useState<ThermometerAnswer | null>(null);

  const walkingQuestionId =
    localWalkingQuestionId ?? syncedWalkDraft?.questionId ?? null;
  const thermoA =
    localThermoA ??
    (syncedWalkDraft && walkingQuestionId === syncedWalkDraft.questionId
      ? syncedWalkDraft.startPoint
      : null);
  const activeThermometerDistanceMeters =
    localWalkingQuestionId === null &&
    syncedWalkDraft &&
    walkingQuestionId === syncedWalkDraft.questionId &&
    syncedWalkDraft.distanceMeters !== null
      ? syncedWalkDraft.distanceMeters
      : thermometerDistanceMeters;

  const { reading: gpsReading } = useLiveLocation(active && placementMode === "gps", {
    highAccuracy: true,
  });

  const thermoStep: "a" | "b" | "ready" | "walking" = walkingQuestionId
    ? "walking"
    : !thermoA
      ? "a"
      : !thermoB
        ? "b"
        : "ready";

  const thermoTravelMeters =
    thermoA && thermoB ? distanceBetweenPoints(thermoA, thermoB) : null;

  const presetUseCount = Math.max(
    thermometerUseCount(activeAnnotations, activeThermometerDistanceMeters),
    thermometerUseCountFromPending(
      pendingQuestions,
      activeThermometerDistanceMeters,
    ),
  );
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D2P1", presetUseCount);

  const handleWalkComplete = useCallback(
    async (endPoint: LatLngTuple) => {
      if (!thermoA || !walkingQuestionId || !completeThermometerWalk) {
        return;
      }

      const promptText = thermometerQuestionPrompt(
        activeThermometerDistanceMeters,
        distanceUnit,
      );

      await completeThermometerWalk({
        pendingQuestionId: walkingQuestionId,
        startPoint: thermoA,
        endPoint,
        distanceMeters: activeThermometerDistanceMeters,
        promptText,
        replyOptions: hotterColderAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        cardDraw,
        cardKeep,
      });

      setLocalWalkingQuestionId(null);
      setLocalThermoA(null);
      setThermoB(null);
      finishPlacement();
    },
    [
      cardDraw,
      cardKeep,
      completeThermometerWalk,
      distanceUnit,
      finishPlacement,
      thermoA,
      activeThermometerDistanceMeters,
      walkingQuestionId,
    ],
  );

  const walkTrackingActive =
    walkingQuestionId !== null && thermoA !== null;

  const walkTracker = useThermometerWalk({
    active: walkTrackingActive,
    startPoint: thermoA,
    targetDistanceMeters: activeThermometerDistanceMeters,
    onAutoStop: handleWalkComplete,
    onError: setMapError,
  });

  const resetDraft = useCallback(() => {
    walkTracker.cancelWalk();
    setLocalThermoA(null);
    setThermoB(null);
    setLocalWalkingQuestionId(null);
    setThermometerAnswer(null);
    setThermometerDistanceMeters(
      availableThermometerDistancePresetsForSession(sessionRules)[0] ??
        DEFAULT_THERMOMETER_DISTANCE_METERS,
    );
  }, [sessionRules, walkTracker]);

  const startGpsWalk = useCallback(async () => {
    if (!canSubmitQuestion || hasOpenPendingQuestion(pendingQuestions)) {
      setMapError("Finish the current question before starting another.");
      return;
    }

    if (
      !isThermometerDistanceOptionAvailableForSession(
        sessionRules,
        activeThermometerDistanceMeters,
      )
    ) {
      setMapError("That distance is not available for this game size.");
      return;
    }

    if (!gpsReading) {
      setMapError("Waiting for GPS fix…");
      return;
    }

    const start: LatLngTuple = [gpsReading.lat, gpsReading.lng];
    setLocalThermoA(start);
    setThermoB(null);

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const distanceLabel = thermometerQuestionPrompt(
        activeThermometerDistanceMeters,
        distanceUnit,
      );
      const startMessage = `Thermometer walk started — ${distanceLabel}`;
      const questionId = await submitPendingQuestion({
        promptText: startMessage,
        replyOptions: [],
        placement: thermometerWalkStartPlacement(
          start,
          activeThermometerDistanceMeters,
        ),
        status: "walking",
      });

      if (typeof questionId === "string") {
        setLocalWalkingQuestionId(questionId);
      }
      return;
    }

    setMapError("Multiplayer required for GPS thermometer walks.");
  }, [
    awaitHiderAnswer,
    canSubmitQuestion,
    distanceUnit,
    sessionRules,
    gpsReading,
    pendingQuestions,
    sessionId,
    senderUid,
    setMapError,
    submitPendingQuestion,
    activeThermometerDistanceMeters,
  ]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || placementMode !== "manual") {
        return false;
      }

      if (!thermoA) {
        setLocalThermoA(point);
      } else if (!thermoB) {
        setThermoB(point);
      }

      return true;
    },
    [active, placementMode, thermoA, thermoB],
  );

  const commitManual = async () => {
    if (!thermoA || !thermoB) {
      return;
    }

    if (hasOpenPendingQuestion(pendingQuestions)) {
      setMapError("Finish the current question before starting another.");
      return;
    }

    if (
      thermoTravelMeters !== null &&
      thermoTravelMeters + 1 < activeThermometerDistanceMeters
    ) {
      setMapError("Movement is shorter than the selected distance.");
      return;
    }

    const geometry: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [thermoA[1], thermoA[0]],
          [thermoB[1], thermoB[0]],
        ],
      },
    };

    const promptText = thermometerQuestionPrompt(
      activeThermometerDistanceMeters,
      distanceUnit,
    );

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      if (thermoA) {
        await submitPendingQuestion({
          promptText: `Thermometer — start pin placed.`,
          replyOptions: [],
          placement: thermometerWalkStartPlacement(
            thermoA,
            activeThermometerDistanceMeters,
          ),
          status: "walking",
        });
      }

      await submitPendingQuestion({
        promptText,
        replyOptions: hotterColderAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata: { thermometerDistanceMeters: activeThermometerDistanceMeters },
        },
        status: "pending",
        cardDraw,
        cardKeep,
      });

      resetDraft();
      finishPlacement();
      return;
    }

    if (thermometerAnswer === null) {
      return;
    }

    await createAnnotation({
      type: "thermometer",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        hotterTowards: thermometerHotterTowards(thermometerAnswer),
        thermometerDistanceMeters: activeThermometerDistanceMeters,
        thermometerAnswer,
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    });

    resetDraft();
    finishPlacement();
  };

  const commitManualLocked = () =>
    runLocked(async () => {
      await commitManual();
    });

  const placementCrosshair =
    active && placementMode === "manual" && thermoStep !== "ready";

  const panel = (
    <ThermometerPanel
      distanceUnit={distanceUnit}
      gameSize={sessionGameSize(sessionRules)}
      distanceMeters={activeThermometerDistanceMeters}
      travelMeters={walkTracker.distanceTraveledMeters ?? thermoTravelMeters}
      answer={thermometerAnswer}
      step={thermoStep === "walking" ? "b" : thermoStep}
      presetUseCount={presetUseCount}
      costLabel={costLabel}
      placementMode={placementMode}
      walkingActive={thermoStep === "walking"}
      onPlacementModeChange={setPlacementMode}
      onDistanceChange={setThermometerDistanceMeters}
      onAnswerChange={setThermometerAnswer}
      onReset={resetDraft}
      onStartWalk={() => void startGpsWalk()}
      onCommit={() => void commitManualLocked()}
      awaitHiderAnswer={awaitHiderAnswer}
      canSubmitQuestion={canSubmitQuestion}
      isSubmitting={isSubmitting}
    />
  );

  return {
    draft: {
      thermoA,
      thermoB,
      thermometerAnswer,
      thermometerDistanceMeters: activeThermometerDistanceMeters,
      walkingQuestionId,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit: commitManualLocked,
    panel,
    walkCurrentPoint: walkTracker.currentPoint,
  };
}
