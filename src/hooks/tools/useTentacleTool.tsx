import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLatestRequest } from "../forms/useLatestRequest";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import { TentacleHudBody } from "../../components/tools/ask/TentacleHudBody";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  isActive,
  type AnnotationRecord,
  type GameArea,
  type TentaclePoi,
} from "../../domain/map/annotations";
import { formatDistance, type DistanceUnit } from "../../domain/map/distance";
import type { SessionRulesInput } from "../../domain/session/rules";
import { sessionGameSize } from "../../domain/session/rules";
import {
  firstAvailableTentacleCategoryIdForSession,
  isTentacleCategoryAvailableInSession,
  tentacleCategoryUseCount,
  tentacleCategoryUseCountFromPending,
  tentacleSearchRadiusMetersForSession,
  usedTentacleCategoryIds,
  type TentacleExtendedCategoryId,
} from "../../domain/questions";
import { questionCostBreakdown } from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import { fetchTentaclePois } from "../../services/geo/overpass/tentacleOverpass";
import { overpassErrorMessage } from "../../services/core/overpass/overpassClient";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import {
  filterConfirmedTentaclePois,
  isConfirmedPoiLike,
  poiCandidateToTentaclePoi,
} from "@/domain/geo/poiCandidateAdapters";
import { useMapStore } from "@/state/mapStore";
import { useToolSession } from "./framework/useToolSession";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { commitTentacle } from "./tentacle/commitTentacle";

interface TentacleSessionConfig {
  /** Marker config — draft state stays in local React state for this adapter. */
  ready: true;
}

interface UseTentacleToolParams {
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

export function useTentacleTool({
  active,
  annotations,
  pendingQuestions = [],
  gameArea,
  sessionRules,
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
}: UseTentacleToolParams) {
  const wizardStepRef = useRef("place");
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);
  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );
  const usedTentacleCategories = useMemo(
    () => usedTentacleCategoryIds(activeAnnotations),
    [activeAnnotations],
  );
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(
    null,
  );
  const [tentacleCategoryId, setTentacleCategoryId] =
    useState<TentacleExtendedCategoryId | null>(null);
  const [tentacleCategoryChosen, setTentacleCategoryChosen] = useState(false);
  const tentacleUseCount = tentacleCategoryId
    ? Math.max(
        tentacleCategoryUseCount(activeAnnotations, tentacleCategoryId),
        tentacleCategoryUseCountFromPending(
          pendingQuestions,
          tentacleCategoryId,
        ),
      )
    : 0;
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D4P2", tentacleUseCount);
  const [tentaclePois, setTentaclePois] = useState<TentaclePoi[]>([]);
  const [tentacleOutOfReach, setTentacleOutOfReach] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const selectedPoiIdRef = useRef(selectedPoiId);
  useEffect(() => {
    selectedPoiIdRef.current = selectedPoiId;
  }, [selectedPoiId]);
  const [tentacleLoading, setTentacleLoading] = useState(false);
  const [tentacleError, setTentacleError] = useState<string | null>(null);

  const previewTentacleCategoryId =
    tentacleCategoryId ??
    (tentacleCenter
      ? firstAvailableTentacleCategoryIdForSession(
          sessionRules,
          usedTentacleCategories,
        )
      : null);
  const searchRadiusMeters =
    tentacleCenter && previewTentacleCategoryId
      ? tentacleSearchRadiusMetersForSession(
          sessionRules,
          previewTentacleCategoryId,
        )
      : 0;

  useToolSessionOptions({
    active: active && tentacleCategoryChosen && tentacleCategoryId !== null,
    usedOptions: usedTentacleCategories,
    currentOption: tentacleCategoryId ?? "museum",
    isAvailable: (_usedOptions, currentOption) =>
      isTentacleCategoryAvailableInSession(sessionRules, currentOption),
    pickNext: (usedOptions) =>
      firstAvailableTentacleCategoryIdForSession(sessionRules, usedOptions) ??
      "museum",
    onUnavailable: useCallback(
      (nextCategory: TentacleExtendedCategoryId) => {
        setTentacleCategoryId(nextCategory);
        setTentaclePois([]);
        setTentacleOutOfReach(false);
        setSelectedPoiId(null);
        setTentacleError(null);
      },
      [],
    ),
  });

  const { beginRequest, cancelRequests, isLatestRequest } = useLatestRequest();

  const tentacleApplyPhaseRef = useRef(new Map<number, number>());

  const applyTentaclePoisResult = useCallback(
    (
      requestId: number,
      pois: Awaited<ReturnType<typeof fetchTentaclePois>>,
      phase: 0 | 1,
    ) => {
      if (!isLatestRequest(requestId)) {
        return;
      }

      const lastPhase = tentacleApplyPhaseRef.current.get(requestId) ?? -1;
      if (phase < lastPhase) {
        return;
      }
      tentacleApplyPhaseRef.current.set(requestId, phase);

      setTentaclePois(pois);
      const selectedId = selectedPoiIdRef.current;
      if (selectedId && !pois.some((poi) => poi.id === selectedId)) {
        setSelectedPoiId(null);
      }
      if (pois.length === 0) {
        setTentacleError(
          `No named locations were found within ${formatDistance(searchRadiusMeters, distanceUnit)}.`,
        );
        return;
      }

      setTentacleError(null);
    },
    [distanceUnit, isLatestRequest, searchRadiusMeters],
  );

  const loadPoisForCenter = useCallback(
    async (center: LatLngTuple, categoryId: TentacleExtendedCategoryId) => {
      const requestId = beginRequest();
      tentacleApplyPhaseRef.current.delete(requestId);
      setTentacleLoading(true);
      setTentacleError(null);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);

      const tilePreview = previewBasemapPois({
        mapStyle: useMapStore.getState().mapStyle,
        categoryIds: [categoryId],
        point: center,
        maxDistanceMeters: searchRadiusMeters,
        maxResults: 48,
      }).map((candidate) => poiCandidateToTentaclePoi(candidate, categoryId));
      if (tilePreview.length > 0) {
        applyTentaclePoisResult(requestId, tilePreview, 0);
      } else {
        setTentaclePois([]);
      }

      try {
        const pois = await fetchTentaclePois(
          center,
          searchRadiusMeters,
          categoryId,
          {
            customCategories: sessionRules.customCategories,
            customLocationPins: sessionRules.customLocationPins,
            regionPackId: sessionRules.regionPackId,
            onEnrich: (enrichedPois) => {
              applyTentaclePoisResult(requestId, enrichedPois, 1);
            },
          },
        );

        applyTentaclePoisResult(requestId, pois, 0);
      } catch (error) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setTentacleError(
          overpassErrorMessage(error, "Locations didn't load."),
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setTentacleLoading(false);
        }
      }
    },
    [
      applyTentaclePoisResult,
      beginRequest,
      isLatestRequest,
      searchRadiusMeters,
      sessionRules,
    ],
  );

  const debouncedTentacleCenter = useDebouncedValue(tentacleCenter, 400);

  useEffect(() => {
    if (!active || !debouncedTentacleCenter || !tentacleCategoryChosen || !tentacleCategoryId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPoisForCenter(debouncedTentacleCenter, tentacleCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    active,
    tentacleCategoryChosen,
    tentacleCategoryId,
    debouncedTentacleCenter,
    loadPoisForCenter,
  ]);

  const resetDraft = useCallback(() => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCenter(null);
    setTentacleCategoryId(null);
    setTentacleCategoryChosen(false);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
  }, [cancelRequests]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      if (wizardStepRef.current !== "place") {
        return false;
      }

      const mapStyle = useMapStore.getState().mapStyle;
      const categoryForTap = tentacleCategoryChosen
        ? tentacleCategoryId
        : null;
      const tapHit =
        categoryForTap != null
          ? previewBasemapPois({
              mapStyle,
              categoryIds: [categoryForTap],
              point,
              maxResults: 1,
            })[0]
          : previewBasemapPois({
              mapStyle,
              point,
              maxResults: 1,
            })[0];
      const nextCenter = tapHit?.point ?? point;

      cancelRequests();
      setTentacleLoading(false);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);
      setTentacleCenter(nextCenter);
      setAwaitingPlacement(false);
      setMapError(null);
      setTentacleError(null);
      return true;
    },
    [
      active,
      cancelRequests,
      setAwaitingPlacement,
      setMapError,
      tentacleCategoryChosen,
      tentacleCategoryId,
    ],
  );

  const handleUseGps = async () => {
    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        return;
      }

      cancelRequests();
      setTentacleLoading(false);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);
      setTentacleCenter(point);
      setAwaitingPlacement(false);
      setMapError(null);
      setTentacleError(null);
    } catch (error) {
      setMapError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const clearAfterCommit = useCallback(() => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCenter(null);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
    setMapError(null);
    finishPlacementRef.current();
  }, [cancelRequests, setMapError]);

  const session = useToolSession<TentacleSessionConfig>({
    toolId: "tentacle",
    active,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      const confirmedPois = filterConfirmedTentaclePois(tentaclePois);
      if (confirmedPois.length === 0) {
        setMapError(
          tentacleLoading
            ? "Still confirming map places. Wait a moment, then try again."
            : "No confirmed locations found near this anchor.",
        );
        return;
      }
      if (
        !tentacleOutOfReach &&
        selectedPoiId &&
        !confirmedPois.some((poi) => poi.id === selectedPoiId)
      ) {
        setMapError("That place is still a map preview. Wait for confirmation.");
        return;
      }
      await commitTentacle({
        canSubmitQuestion,
        tentacleCategoryChosen,
        tentacleCategoryId,
        tentacleCenter,
        tentaclePois: confirmedPois,
        tentacleOutOfReach,
        selectedPoiId,
        searchRadiusMeters,
        sessionRules,
        gameArea,
        awaitHiderAnswer,
        submitPendingQuestion,
        sessionId,
        senderUid,
        distanceUnit,
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
    active && (awaitingPlacement || tentacleCenter === null);

  const handleCategoryChange = (nextCategory: TentacleExtendedCategoryId) => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCategoryId(nextCategory);
    setTentacleCategoryChosen(true);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
  };

  const handleSelectPoi = useCallback((poiId: string) => {
    const poi = tentaclePois.find((entry) => entry.id === poiId);
    if (poi && !isConfirmedPoiLike(poi)) {
      setTentacleError(
        "Preview only — wait until places confirm before selecting.",
      );
      return;
    }
    setTentacleOutOfReach(false);
    setTentacleError(null);
    setSelectedPoiId(poiId);
  }, [tentaclePois]);

  const panel = (
    <TentaclePanel
      gameSize={sessionGameSize(sessionRules)}
      categoryId={tentacleCategoryId}
      categoryChosen={tentacleCategoryChosen}
      searchRadiusMeters={searchRadiusMeters}
      usedCategoryIds={usedTentacleCategories}
      distanceUnit={distanceUnit}
      poiOptions={tentaclePois}
      selectedPoiId={selectedPoiId}
      outOfReach={tentacleOutOfReach}
      loading={tentacleLoading}
      awaitingPlacement={awaitingPlacement}
      hasCenter={tentacleCenter !== null}
      gpsLoading={gpsLoading}
      error={tentacleError ?? mapError ?? gpsError}
      onCategoryChange={handleCategoryChange}
      onUseGps={() => void handleUseGps()}
      onPlaceAtMapTap={armPlacement}
      onSelectPoi={handleSelectPoi}
      onOutOfReachChange={(nextOutOfReach) => {
        setTentacleOutOfReach(nextOutOfReach);
        if (nextOutOfReach) {
          setSelectedPoiId(null);
        }
      }}
      onCommit={() => void commit()}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={costLabel}
      isSubmitting={session.isBusy}
      onRetry={
        tentacleCenter && tentacleCategoryId
          ? () => void loadPoisForCenter(tentacleCenter, tentacleCategoryId)
          : undefined
      }
      wizardStepRef={wizardStepRef}
    />
  );

  // Drive map-click routing without mounting TentaclePanel wizard.
  useEffect(() => {
    if (!tentacleCategoryChosen) {
      wizardStepRef.current = "category";
      return;
    }
    if (!tentacleCenter || tentacleLoading) {
      wizardStepRef.current = "place";
      return;
    }
    wizardStepRef.current = "ask";
  }, [tentacleCategoryChosen, tentacleCenter, tentacleLoading]);

  const gameSize = sessionGameSize(sessionRules);
  const categorySelectionAvailable =
    tentacleCategoryId !== null &&
    isTentacleCategoryAvailableInSession(sessionRules, tentacleCategoryId);
  const hasRecordedAnswer = tentacleOutOfReach || selectedPoiId !== null;

  const readiness: AskHudReadiness = {
    surface: "tentacle",
    placementReady: tentacleCenter !== null,
    configureReady: tentacleCategoryChosen && categorySelectionAvailable,
    resolveReady: tentaclePois.length > 0 && !tentacleLoading,
    answerReady: awaitHiderAnswer || hasRecordedAnswer,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
    resolving: tentacleLoading && tentacleCenter !== null,
  };

  const hud = {
    readiness,
    costLabel,
    error: tentacleError ?? mapError ?? gpsError ?? null,
    onCommit: () => void commit(),
    modeBody: (
      <TentacleHudBody
        gameSize={gameSize}
        categoryId={tentacleCategoryId}
        categoryChosen={tentacleCategoryChosen}
        searchRadiusMeters={searchRadiusMeters}
        usedCategoryIds={usedTentacleCategories}
        distanceUnit={distanceUnit}
        poiOptions={tentaclePois}
        selectedPoiId={selectedPoiId}
        outOfReach={tentacleOutOfReach}
        loading={tentacleLoading}
        awaitingPlacement={awaitingPlacement}
        hasCenter={tentacleCenter !== null}
        gpsLoading={gpsLoading}
        error={tentacleError ?? mapError ?? gpsError}
        onCategoryChange={handleCategoryChange}
        onUseGps={() => void handleUseGps()}
        onPlaceAtMapTap={armPlacement}
        onSelectPoi={handleSelectPoi}
        onOutOfReachChange={(nextOutOfReach) => {
          setTentacleOutOfReach(nextOutOfReach);
          if (nextOutOfReach) {
            setSelectedPoiId(null);
          }
        }}
        awaitHiderAnswer={awaitHiderAnswer}
      />
    ),
    sheets: null as ReactNode,
  };

  return {
    draft: {
      tentacleCenter,
      tentacleSearchRadiusMeters: searchRadiusMeters,
      tentacleAnswerRadiusMeters: searchRadiusMeters,
      tentaclePois,
      tentacleSelectedPoiId: selectedPoiId,
      tentacleOutOfReach,
      seekerResolving: tentacleLoading && tentacleCenter !== null,
    },
    placementCrosshair,
    handleMapClick,
    selectDraftPoi: handleSelectPoi,
    resetDraft,
    tentacleLodPhase: "complete" as const,
    commit,
    panel,
    hud,
  };
}
