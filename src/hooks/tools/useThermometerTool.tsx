import { useCallback, useMemo, useState } from "react";
import type { Feature, LineString } from "geojson";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import type { LatLngTuple } from "../../domain/geometry";
import { distanceBetweenPoints } from "../../domain/geometry";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { sessionGameSize } from "../../domain/sessionRules";
import { hasOpenPendingQuestion } from "../../domain/questionRules";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import {
  DEFAULT_THERMOMETER_DISTANCE_METERS,
  availableThermometerDistancePresetsForSession,
  isThermometerDistanceOptionAvailableForSession,
  thermometerHotterTowards,
  thermometerQuestionPrompt,
  thermometerUseCount,
  type ThermometerAnswer,
} from "../../domain/thermometerQuestions";
import type { DistanceUnit } from "../../domain/distance";
import { hotterColderAnswerOptions } from "../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
import { useLiveLocation } from "../useLiveLocation";
import {
  thermometerWalkStartPlacement,
  useThermometerWalk,
} from "./useThermometerWalk";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";
import { questionCostLabel } from "../../domain/questionRules";

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
  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );

  const [placementMode, setPlacementMode] = useState<PlacementMode>("gps");
  const [thermoA, setThermoA] = useState<LatLngTuple | null>(null);
  const [thermoB, setThermoB] = useState<LatLngTuple | null>(null);
  const [walkingQuestionId, setWalkingQuestionId] = useState<string | null>(
    null,
  );
  const [thermometerDistanceMeters, setThermometerDistanceMeters] = useState(
    () =>
      availableThermometerDistancePresetsForSession(sessionRules)[0] ??
      DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [thermometerAnswer, setThermometerAnswer] =
    useState<ThermometerAnswer | null>(null);

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

  const presetUseCount = thermometerUseCount(
    activeAnnotations,
    thermometerDistanceMeters,
  );
  const costLabel = questionCostLabel("D2P1", presetUseCount);

  const handleWalkComplete = useCallback(
    async (endPoint: LatLngTuple) => {
      if (!thermoA || !walkingQuestionId || !completeThermometerWalk) {
        return;
      }

      const promptText = thermometerQuestionPrompt(
        thermometerDistanceMeters,
        distanceUnit,
      );

      await completeThermometerWalk({
        pendingQuestionId: walkingQuestionId,
        startPoint: thermoA,
        endPoint,
        distanceMeters: thermometerDistanceMeters,
        promptText,
        replyOptions: hotterColderAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
      });

      setWalkingQuestionId(null);
      setThermoA(null);
      setThermoB(null);
      finishPlacement();
    },
    [
      completeThermometerWalk,
      distanceUnit,
      finishPlacement,
      thermoA,
      thermometerDistanceMeters,
      walkingQuestionId,
    ],
  );

  const walkTracker = useThermometerWalk({
    active: active && thermoStep === "walking",
    startPoint: thermoA,
    targetDistanceMeters: thermometerDistanceMeters,
    onAutoStop: (endPoint) => {
      setThermoB(endPoint);
      void handleWalkComplete(endPoint);
    },
  });

  const resetDraft = useCallback(() => {
    walkTracker.cancelWalk();
    setThermoA(null);
    setThermoB(null);
    setWalkingQuestionId(null);
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
        thermometerDistanceMeters,
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
    setThermoA(start);
    setThermoB(null);

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const distanceLabel = thermometerQuestionPrompt(
        thermometerDistanceMeters,
        distanceUnit,
      );
      const startMessage = `Thermometer walk started — ${distanceLabel}`;
      const questionId = await submitPendingQuestion({
        promptText: startMessage,
        replyOptions: [],
        placement: thermometerWalkStartPlacement(
          start,
          thermometerDistanceMeters,
        ),
        status: "walking",
      });

      if (typeof questionId === "string") {
        setWalkingQuestionId(questionId);
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
    thermometerDistanceMeters,
  ]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || placementMode !== "manual") {
        return false;
      }

      if (!thermoA) {
        setThermoA(point);
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
      thermoTravelMeters + 1 < thermometerDistanceMeters
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
      thermometerDistanceMeters,
      distanceUnit,
    );

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      if (thermoA) {
        await submitPendingQuestion({
          promptText: `Thermometer — start pin placed.`,
          replyOptions: [],
          placement: thermometerWalkStartPlacement(
            thermoA,
            thermometerDistanceMeters,
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
          metadata: { thermometerDistanceMeters },
        },
        status: "pending",
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
        thermometerDistanceMeters,
        thermometerAnswer,
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    });

    resetDraft();
    finishPlacement();
  };

  const placementCrosshair =
    active && placementMode === "manual" && thermoStep !== "ready";

  const panel = (
    <ThermometerPanel
      distanceUnit={distanceUnit}
      gameSize={sessionGameSize(sessionRules)}
      distanceMeters={thermometerDistanceMeters}
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
      onCommit={() => void commitManual()}
      awaitHiderAnswer={awaitHiderAnswer}
      canSubmitQuestion={canSubmitQuestion}
    />
  );

  return {
    draft: {
      thermoA,
      thermoB,
      thermometerAnswer,
      thermometerDistanceMeters,
      walkingQuestionId,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit: commitManual,
    panel,
    walkCurrentPoint: walkTracker.currentPoint,
  };
}
