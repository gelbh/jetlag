import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OracleAskReceipt } from "../../components/session/castle-siege/OracleAskReceipt";
import { RadarHudBody } from "../../components/tools/ask/radar/RadarHudBody";
import {
  RadarMapPlacementChrome,
  type RadarMapPlacementPhase,
} from "../../components/tools/ask/radar/RadarMapPlacementChrome";
import { RadarPanel } from "../../components/tools/RadarPanel";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { type AnnotationRecord, isActive } from "../../domain/map/annotations";
import {
  type DistanceUnit,
  formatPresetDistance,
  parseDistanceInput,
} from "../../domain/map/distance";
import { defaultRadarPresetMeters } from "../../domain/map/distancePresets";
import {
  isRadarRadiusAllowedForGameSize,
  questionCostBreakdown,
  type RadarAnswer,
  radarDistanceUseCount,
  radarDistanceUseCountFromPending,
  radarQuestionPrompt,
  usedRadarDistanceOptionsForSession,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SessionMode } from "../../domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "../../domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "../../domain/session/castleSiege/pregame";
import { resolveAskPath } from "../../domain/session/castleSiege/resolveAskPath";
import type { GameSize } from "../../domain/session/size/gameSize";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import type { AnswerCastleSiegeOracleAskFn } from "../../services/session/castleSiegeOracleAsk";
import { useAutoPlacementGps } from "./framework/useAutoPlacementGps";
import { useToolPreset } from "./framework/useToolPreset";
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
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
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
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam | null;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
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
  sessionMode = null,
  defenderTeamId = null,
  callOracleAsk,
}: UseRadarToolParams) {
  const wizardStepRef = useRef("place");
  const submittingRef = useRef(false);
  const finishPlacementRef = useRef(finishPlacement);
  const [oracleReceipt, setOracleReceipt] = useState<Extract<
    CastleSiegeOracleReceipt,
    { kind: "radar" }
  > | null>(null);
  const oraclePath = resolveAskPath(sessionMode) === "oracle";
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);
  useEffect(() => {
    if (!active) {
      setOracleReceipt(null);
    }
  }, [active]);

  const activeAnnotations = useMemo(() => annotations.filter(isActive), [annotations]);
  const usedRadarOptions = useMemo(
    () => usedRadarDistanceOptionsForSession(activeAnnotations, pendingQuestions, distanceUnit),
    [activeAnnotations, distanceUnit, pendingQuestions],
  );
  const defaultRadius = defaultRadarPresetMeters(distanceUnit);
  const [radarRadius, setRadarRadius] = useState<number | null>(null);
  const [radarCustomRadius, setRadarCustomRadius] = useState("");
  const [radarChooseCustom, setRadarChooseCustom] = useState(false);
  const [radarAnswer, setRadarAnswer] = useState<RadarAnswer | null>(null);
  const [radarCenter, setRadarCenter] = useState<LatLngTuple | null>(null);
  const [editingDistance, setEditingDistance] = useState(false);
  /** Ignore catalog taps briefly after back — same-gesture click-through. */
  const [distanceCatalogArmed, setDistanceCatalogArmed] = useState(true);
  const distanceCatalogArmEpochRef = useRef(0);

  const resolvedRadarRadius = radarChooseCustom
    ? (parseDistanceInput(radarCustomRadius, distanceUnit) ?? radarRadius ?? defaultRadius)
    : (radarRadius ?? defaultRadius);

  const radarUseCount = Math.max(
    radarDistanceUseCount(activeAnnotations, radarChooseCustom, resolvedRadarRadius, distanceUnit),
    radarDistanceUseCountFromPending(
      pendingQuestions,
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    ),
  );
  const {
    label: costLabel,
    draw: cardDraw,
    keep: cardKeep,
  } = questionCostBreakdown("D2P1", radarUseCount);

  const resetDraft = useCallback(() => {
    setRadarRadius(null);
    setRadarCustomRadius("");
    setRadarChooseCustom(false);
    setRadarAnswer(null);
    setRadarCenter(null);
    setEditingDistance(false);
    setOracleReceipt(null);
  }, []);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || submittingRef.current) {
        return false;
      }

      const wizardStep = wizardStepRef.current;
      if (wizardStep !== "place" && wizardStep !== "ask") {
        return false;
      }

      setRadarAnswer(null);
      setRadarCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      return true;
    },
    [active, setAwaitingPlacement, setMapError],
  );

  const handleUseGps = useCallback(
    async (shouldApply?: () => boolean) => {
      if (submittingRef.current) {
        return;
      }
      try {
        const reading = await refreshGps();
        if (shouldApply && !shouldApply()) {
          return;
        }
        const point: LatLngTuple = [reading.lat, reading.lng];
        if (!ensurePointInGameArea(point)) {
          return;
        }

        setRadarAnswer(null);
        setRadarCenter(point);
        setAwaitingPlacement(false);
        setMapError(null);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : "GPS location unavailable.");
      }
    },
    [ensurePointInGameArea, refreshGps, setAwaitingPlacement, setMapError],
  );

  const clearAfterCommit = useCallback(() => {
    setRadarCenter(null);
    setRadarAnswer(null);
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setOracleReceipt(null);
    setMapError(null);
    finishPlacementRef.current();
  }, [setMapError]);

  const session = useToolSession<RadarSessionConfig>({
    toolId: "radar",
    createInitialConfig: () => ({ ready: true }),
    onClose: resetDraft,
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
        awaitHiderAnswer: oraclePath ? false : awaitHiderAnswer,
        submitPendingQuestion: oraclePath ? undefined : submitPendingQuestion,
        sessionId,
        senderUid,
        cardDraw,
        cardKeep,
        createAnnotation,
        setMapError,
        onSuccess: clearAfterCommit,
        sessionMode,
        defenderTeamId: defenderTeamId ?? undefined,
        callOracleAsk,
        oracleReceipt,
        onOracleReceipt: setOracleReceipt,
      });
    },
  });
  useEffect(() => {
    submittingRef.current = session.phase === "submitting";
  }, [session.phase]);

  const commit = () => session.submit();

  const placementCrosshair = active && (awaitingPlacement || radarCenter === null);

  const hasCenter = radarCenter !== null;
  const resolvedForReady = radarChooseCustom
    ? (parseDistanceInput(radarCustomRadius, distanceUnit) ?? radarRadius)
    : radarRadius;
  const distanceSelectionAvailable =
    resolvedForReady !== null &&
    isRadarRadiusAllowedForGameSize(gameSize, resolvedForReady, distanceUnit, radarChooseCustom);

  const onPresetSelect = (radiusMeters: number) => {
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setRadarRadius(radiusMeters);
    setEditingDistance(false);
  };

  useToolPreset("radar", active, (key) => {
    if (typeof key === "number") onPresetSelect(key);
  });

  const onChooseSelect = () => {
    if (!distanceCatalogArmed) {
      return;
    }
    setRadarChooseCustom(true);
    setEditingDistance(true);
  };

  const onCustomDistanceCommit = () => {
    if (!radarChooseCustom || !distanceSelectionAvailable) {
      return;
    }
    setEditingDistance(false);
  };

  const reopenDistancePicker = () => {
    setRadarRadius(null);
    setRadarChooseCustom(false);
    setRadarCustomRadius("");
    setEditingDistance(true);
    setDistanceCatalogArmed(false);
    const epoch = distanceCatalogArmEpochRef.current + 1;
    distanceCatalogArmEpochRef.current = epoch;
    window.setTimeout(() => {
      if (distanceCatalogArmEpochRef.current === epoch) {
        setDistanceCatalogArmed(true);
      }
    }, 350);
  };

  const onPresetSelectArmed = (radiusMeters: number) => {
    if (!distanceCatalogArmed) {
      return;
    }
    onPresetSelect(radiusMeters);
  };

  const mapFirstEligible = distanceSelectionAvailable && !editingDistance;

  const placementGeo = useAutoPlacementGps({
    eligible: mapFirstEligible,
    entryKey: resolvedForReady,
    hasPoint: radarCenter !== null,
    requestGps: handleUseGps,
  });

  useEffect(() => {
    return () => {
      distanceCatalogArmEpochRef.current += 1;
    };
  }, []);

  const mapPlacementActive = Boolean(mapFirstEligible);
  const placementError = (radarCenter === null ? gpsError : null) ?? mapError ?? null;

  let placementPhase: RadarMapPlacementPhase;
  if (radarCenter !== null) {
    placementPhase = "answer";
  } else if (gpsLoading || placementGeo === "checking") {
    placementPhase = "locating";
  } else if (placementGeo === "denied" || placementGeo === "prompt") {
    placementPhase = placementError ? "failed" : "needs_permission";
  } else if (placementError) {
    placementPhase = "failed";
  } else {
    placementPhase = "needs_permission";
  }

  const distanceLabel =
    resolvedForReady !== null ? formatPresetDistance(resolvedForReady, distanceUnit) : "Distance";

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
      onChooseSelect={onChooseSelect}
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

  const effectiveAwaitHider = oraclePath ? false : awaitHiderAnswer;
  const answerReady = oraclePath || effectiveAwaitHider || radarAnswer !== null;

  const readiness: AskHudReadiness = {
    surface: "radar",
    placementReady: hasCenter,
    configureReady: distanceSelectionAvailable,
    resolveReady: true,
    answerReady,
    awaitHiderAnswer: effectiveAwaitHider,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const canCommitRadar =
    hasCenter &&
    distanceSelectionAvailable &&
    answerReady &&
    canSubmitQuestion &&
    !session.isBusy &&
    // Confirm-send uses OracleAskReceipt button once receipt is ready.
    !(oraclePath && oracleReceipt);

  const oracleReceiptBody = oracleReceipt ? (
    <OracleAskReceipt
      receipt={oracleReceipt}
      busy={session.isBusy}
      onConfirmSend={() => void commit()}
      onCancel={() => setOracleReceipt(null)}
    />
  ) : null;

  const hud = {
    readiness,
    costLabel,
    error: null,
    onCommit: () => void commit(),
    suppressSheet: mapPlacementActive && !oracleReceipt,
    mapOverlay:
      mapPlacementActive && !oracleReceipt ? (
        <RadarMapPlacementChrome
          distanceLabel={distanceLabel}
          questionPrompt={radarQuestionPrompt(
            resolvedForReady ?? resolvedRadarRadius,
            distanceUnit,
          )}
          costLabel={costLabel}
          phase={placementPhase}
          onUseGps={() => void handleUseGps()}
          gpsLoading={gpsLoading}
          error={placementError}
          awaitHiderAnswer={effectiveAwaitHider}
          answer={radarAnswer}
          onAnswerChange={setRadarAnswer}
          canCommit={canCommitRadar}
          isSubmitting={session.isBusy}
          onCommit={() => void commit()}
          onChangeDistance={reopenDistancePicker}
          radiusMeters={radarRadius}
          chooseCustom={radarChooseCustom}
          customRadius={radarCustomRadius}
          distanceUnit={distanceUnit}
          gameSize={gameSize}
          usedDistanceOptions={usedRadarOptions}
          onPresetSelect={onPresetSelect}
          onChooseSelect={() => {
            // Stay map-first; keep last preset as fallback until custom parses.
            setRadarChooseCustom(true);
          }}
          onCustomRadiusChange={setRadarCustomRadius}
        />
      ) : null,
    modeBody:
      oracleReceiptBody ??
      (mapPlacementActive ? null : (
        <RadarHudBody
          radiusMeters={radarRadius}
          chooseCustom={radarChooseCustom}
          customRadius={radarCustomRadius}
          distanceUnit={distanceUnit}
          gameSize={gameSize}
          usedDistanceOptions={usedRadarOptions}
          answer={radarAnswer}
          onPresetSelect={onPresetSelectArmed}
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={setRadarCustomRadius}
          onCustomDistanceCommit={onCustomDistanceCommit}
          onAnswerChange={setRadarAnswer}
          onUseGps={() => void handleUseGps()}
          onPlaceAtMapTap={armPlacement}
          awaitingPlacement={awaitingPlacement}
          hasCenter={hasCenter}
          gpsLoading={gpsLoading}
          awaitHiderAnswer={effectiveAwaitHider}
          viewOnly={!canSubmitQuestion}
          costLabel={costLabel}
          toolLabel="Radar"
          editingDistance={editingDistance}
        />
      )),
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
