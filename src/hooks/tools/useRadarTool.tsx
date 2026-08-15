import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RadarHudBody } from "../../components/tools/ask/RadarHudBody";
import { RadarPanel } from "../../components/tools/RadarPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { isActive, type AnnotationRecord } from "../../domain/map/annotations";
import {
  parseDistanceInput,
  type DistanceUnit,
} from "../../domain/map/distance";
import { defaultRadarPresetMeters } from "../../domain/map/distancePresets";
import {
  isRadarRadiusAllowedForGameSize,
  radarDistanceUseCount,
  radarDistanceUseCountFromPending,
  type RadarAnswer,
  usedRadarDistanceOptions,
} from "../../domain/questions";
import { questionCostBreakdown } from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import type { GameSize } from "../../domain/session/size/gameSize";
import { useToolSession } from "./framework/useToolSession";
import { commitRadar } from "./radar/commitRadar";

interface RadarSessionConfig {
  /** Marker config — draft state stays in local React state for this adapter. */
  ready: true;
}

interface UseRadarToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  gameSize: GameSize;
  pendingQuestions?: readonly PendingQuestionRecord[];
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
  senderRole?: "seeker" | "hider";
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

export function useRadarTool({
  active,
  annotations,
  gameSize,
  pendingQuestions = [],
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  distanceUnit,
  finishPlacement,
  setMapError,
  mapError,
  gpsLoading,
  gpsError,
  awaitingPlacement,
  setAwaitingPlacement,
  refreshGps,
  ensurePointInGameArea,
  armPlacement,
  canSubmitQuestion = true,
}: UseRadarToolParams) {
  const wizardStepRef = useRef("place");
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );
  const usedRadarOptions = useMemo(
    () => usedRadarDistanceOptions(activeAnnotations, distanceUnit),
    [activeAnnotations, distanceUnit],
  );
  const defaultRadius = defaultRadarPresetMeters(distanceUnit);
  const [radarRadius, setRadarRadius] = useState<number | null>(null);
  const [radarCustomRadius, setRadarCustomRadius] = useState("");
  const [radarChooseCustom, setRadarChooseCustom] = useState(false);
  const [radarAnswer, setRadarAnswer] = useState<RadarAnswer | null>(null);
  const [radarCenter, setRadarCenter] = useState<LatLngTuple | null>(null);

  const resolvedRadarRadius = radarChooseCustom
    ? (parseDistanceInput(radarCustomRadius, distanceUnit) ??
      radarRadius ??
      defaultRadius)
    : (radarRadius ?? defaultRadius);

  const radarUseCount = Math.max(
    radarDistanceUseCount(
      activeAnnotations,
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    ),
    radarDistanceUseCountFromPending(
      pendingQuestions,
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    ),
  );
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D2P1", radarUseCount);

  const resetDraft = useCallback(() => {
    setRadarRadius(null);
    setRadarCustomRadius("");
    setRadarChooseCustom(false);
    setRadarAnswer(null);
    setRadarCenter(null);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset draft when tool closes */
    if (active) {
      return;
    }

    resetDraft();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, resetDraft]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      if (wizardStepRef.current !== "place") {
        return false;
      }

      setRadarCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      return true;
    },
    [active, setAwaitingPlacement, setMapError],
  );

  const handleUseGps = async () => {
    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        return;
      }

      setRadarCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
    } catch (error) {
      setMapError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const clearAfterCommit = useCallback(() => {
    setRadarCenter(null);
    setRadarAnswer(null);
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setMapError(null);
    finishPlacementRef.current();
  }, [setMapError]);

  const session = useToolSession<RadarSessionConfig>({
    toolId: "radar",
    active,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      await commitRadar({
        canSubmitQuestion,
        radarCenter,
        radarRadius,
        radarChooseCustom,
        resolvedRadarRadius,
        radarAnswer,
        gameSize,
        distanceUnit,
        usedRadarOptions,
        awaitHiderAnswer,
        submitPendingQuestion,
        sessionId,
        senderUid,
        cardDraw,
        cardKeep,
        createAnnotation,
        setMapError,
        onSuccess: clearAfterCommit,
      });
    },
  });

  const commit = () => session.submit();

  const placementCrosshair =
    active && (awaitingPlacement || radarCenter === null);

  const hasCenter = radarCenter !== null;
  const resolvedForReady = radarChooseCustom
    ? (parseDistanceInput(radarCustomRadius, distanceUnit) ?? radarRadius)
    : radarRadius;
  const distanceSelectionAvailable =
    resolvedForReady !== null &&
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedForReady,
      distanceUnit,
      radarChooseCustom,
    );

  const onPresetSelect = (radiusMeters: number) => {
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setRadarRadius(radiusMeters);
  };

  const panel = (
    <RadarPanel
      radiusMeters={radarRadius}
      chooseCustom={radarChooseCustom}
      customRadius={radarCustomRadius}
      distanceUnit={distanceUnit}
      gameSize={gameSize}
      usedDistanceOptions={usedRadarOptions}
      answer={radarAnswer}
      onPresetSelect={onPresetSelect}
      onChooseSelect={() => setRadarChooseCustom(true)}
      onCustomRadiusChange={setRadarCustomRadius}
      onAnswerChange={setRadarAnswer}
      onUseGps={() => void handleUseGps()}
      onPlaceAtMapTap={armPlacement}
      awaitingPlacement={awaitingPlacement}
      hasCenter={hasCenter}
      onCommit={() => void commit()}
      gpsLoading={gpsLoading}
      error={mapError ?? gpsError}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={costLabel}
      isSubmitting={session.isBusy}
      viewOnly={!canSubmitQuestion}
      wizardStepRef={wizardStepRef}
    />
  );

  const readiness: AskHudReadiness = {
    surface: "radar",
    placementReady: hasCenter,
    configureReady: distanceSelectionAvailable,
    resolveReady: true,
    answerReady: awaitHiderAnswer || radarAnswer !== null,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const hud = {
    readiness,
    costLabel,
    error: mapError ?? gpsError ?? null,
    onCommit: () => void commit(),
    modeBody: (
      <RadarHudBody
        radiusMeters={radarRadius}
        chooseCustom={radarChooseCustom}
        customRadius={radarCustomRadius}
        distanceUnit={distanceUnit}
        gameSize={gameSize}
        usedDistanceOptions={usedRadarOptions}
        answer={radarAnswer}
        onPresetSelect={onPresetSelect}
        onChooseSelect={() => setRadarChooseCustom(true)}
        onCustomRadiusChange={setRadarCustomRadius}
        onAnswerChange={setRadarAnswer}
        onUseGps={() => void handleUseGps()}
        onPlaceAtMapTap={armPlacement}
        awaitingPlacement={awaitingPlacement}
        hasCenter={hasCenter}
        gpsLoading={gpsLoading}
        awaitHiderAnswer={awaitHiderAnswer}
        viewOnly={!canSubmitQuestion}
      />
    ),
    sheets: null as ReactNode,
  };

  return {
    draft: {
      radarCenter,
      radarRadius: resolvedRadarRadius,
      radarChooseCustom,
      radarAnswer,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
    hud,
  };
}
