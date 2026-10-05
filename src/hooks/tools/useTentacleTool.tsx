import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type AskHudReadiness, canCommit as askCanCommit } from "@/domain/ask/askHudModes";
import {
  filterConfirmedTentaclePois,
  isConfirmedPoiLike,
  poiCandidateToTentaclePoi,
} from "@/domain/geo/poiCandidateAdapters";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import { useMapStore } from "@/state/mapStore";
import { TentacleHudBody } from "../../components/tools/ask/tentacle/TentacleHudBody";
import {
  TentacleMapPlacementChrome,
  type TentacleMapPlacementPhase,
} from "../../components/tools/ask/tentacle/TentacleMapPlacementChrome";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  type AnnotationRecord,
  type GameArea,
  isActive,
  type TentaclePoi,
} from "../../domain/map/annotations";
import { type DistanceUnit, formatDistance } from "../../domain/map/distance";
import {
  firstAvailableTentacleCategoryIdForSession,
  isTentacleCategoryAvailableInSession,
  questionCostBreakdown,
  type TentacleExtendedCategoryId,
  tentacleCategoriesForGameSize,
  tentacleCategoryUseCount,
  tentacleCategoryUseCountFromPending,
  tentacleQuestionPrompt,
  tentacleSearchRadiusMetersForSession,
  usedTentacleCategoryIdsForSession,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import { sessionGameSize } from "../../domain/session/rules";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import {
  type GeolocationPermissionState,
  queryGeolocationPermission,
} from "../../services/core/location/geolocation";
import { overpassErrorMessage } from "../../services/core/overpass/overpassClient";
import { fetchTentaclePois } from "../../services/geo/overpass/tentacleOverpass";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import { useLatestRequest } from "../forms/useLatestRequest";
import { useToolSession } from "./framework/useToolSession";
import { commitTentacle } from "./tentacle/commitTentacle";
import { useToolSessionOptions } from "./useToolSessionOptions";

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
  const submittingRef = useRef(false);
  const finishPlacementRef = useRef(finishPlacement);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);
  const activeAnnotations = useMemo(() => annotations.filter(isActive), [annotations]);
  const usedTentacleCategories = useMemo(
    () => usedTentacleCategoryIdsForSession(activeAnnotations, pendingQuestions),
    [activeAnnotations, pendingQuestions],
  );
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(null);
  const [tentacleCategoryId, setTentacleCategoryId] = useState<TentacleExtendedCategoryId | null>(
    null,
  );
  const [tentacleCategoryChosen, setTentacleCategoryChosen] = useState(false);
  const tentacleUseCount = tentacleCategoryId
    ? Math.max(
        tentacleCategoryUseCount(activeAnnotations, tentacleCategoryId),
        tentacleCategoryUseCountFromPending(pendingQuestions, tentacleCategoryId),
      )
    : 0;
  const {
    label: costLabel,
    draw: cardDraw,
    keep: cardKeep,
  } = questionCostBreakdown("D4P2", tentacleUseCount);
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
      ? firstAvailableTentacleCategoryIdForSession(sessionRules, usedTentacleCategories)
      : null);
  const radiusCategoryId =
    previewTentacleCategoryId ??
    firstAvailableTentacleCategoryIdForSession(sessionRules, usedTentacleCategories);
  const searchRadiusMeters = radiusCategoryId
    ? tentacleSearchRadiusMetersForSession(sessionRules, radiusCategoryId)
    : 0;

  useToolSessionOptions({
    active: active && tentacleCategoryChosen && tentacleCategoryId !== null,
    usedOptions: usedTentacleCategories,
    currentOption: tentacleCategoryId ?? "museum",
    isAvailable: (_usedOptions, currentOption) =>
      isTentacleCategoryAvailableInSession(sessionRules, currentOption),
    pickNext: (usedOptions) =>
      firstAvailableTentacleCategoryIdForSession(sessionRules, usedOptions) ?? "museum",
    onUnavailable: useCallback((nextCategory: TentacleExtendedCategoryId) => {
      setTentacleCategoryId(nextCategory);
      setTentaclePois([]);
      setTentacleOutOfReach(false);
      setSelectedPoiId(null);
      setTentacleError(null);
    }, []),
  });

  const { beginRequest, cancelRequests, isLatestRequest } = useLatestRequest();

  const tentacleApplyPhaseRef = useRef(new Map<number, number>());

  const applyTentaclePoisResult = useCallback(
    (requestId: number, pois: Awaited<ReturnType<typeof fetchTentaclePois>>, phase: 0 | 1) => {
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
        const pois = await fetchTentaclePois(center, searchRadiusMeters, categoryId, {
          customCategories: sessionRules.customCategories,
          customLocationPins: sessionRules.customLocationPins,
          regionPackId: sessionRules.regionPackId,
          onEnrich: (enrichedPois) => {
            applyTentaclePoisResult(requestId, enrichedPois, 1);
          },
        });

        applyTentaclePoisResult(requestId, pois, 0);
      } catch (error) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setTentacleError(overpassErrorMessage(error, "Locations didn't load."));
      } finally {
        if (isLatestRequest(requestId)) {
          setTentacleLoading(false);
        }
      }
    },
    [applyTentaclePoisResult, beginRequest, isLatestRequest, searchRadiusMeters, sessionRules],
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
      if (!active || submittingRef.current) {
        return false;
      }

      const wizardStep = wizardStepRef.current;
      if (wizardStep !== "place" && wizardStep !== "ask") {
        return false;
      }

      const mapStyle = useMapStore.getState().mapStyle;
      const categoryForTap = tentacleCategoryChosen ? tentacleCategoryId : null;
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

  const handleUseGps = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }
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
      setMapError(error instanceof Error ? error.message : "GPS location unavailable.");
    }
  }, [cancelRequests, ensurePointInGameArea, refreshGps, setAwaitingPlacement, setMapError]);

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
  submittingRef.current = session.phase === "submitting";

  const commit = () => session.submit();

  const placementCrosshair = active && (awaitingPlacement || tentacleCenter === null);

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

  const handleSelectPoi = useCallback(
    (poiId: string) => {
      const poi = tentaclePois.find((entry) => entry.id === poiId);
      if (poi && !isConfirmedPoiLike(poi)) {
        setTentacleError("Preview only — wait until places confirm before selecting.");
        return;
      }
      setTentacleOutOfReach(false);
      setTentacleError(null);
      setSelectedPoiId(poiId);
    },
    [tentaclePois],
  );

  const panel = (
    <TentaclePanel
      model={{
        gameSize: sessionGameSize(sessionRules),
        categoryId: tentacleCategoryId,
        categoryChosen: tentacleCategoryChosen,
        searchRadiusMeters,
        usedCategoryIds: usedTentacleCategories,
        distanceUnit,
        poiOptions: tentaclePois,
        selectedPoiId,
        outOfReach: tentacleOutOfReach,
        loading: tentacleLoading,
        awaitingPlacement,
        hasCenter: tentacleCenter !== null,
        gpsLoading,
        error: tentacleError ?? mapError ?? gpsError,
        onCategoryChange: handleCategoryChange,
        onUseGps: () => void handleUseGps(),
        onPlaceAtMapTap: armPlacement,
        onSelectPoi: handleSelectPoi,
        onOutOfReachChange: (nextOutOfReach) => {
          setTentacleOutOfReach(nextOutOfReach);
          if (nextOutOfReach) {
            setSelectedPoiId(null);
          }
        },
        onCommit: () => void commit(),
        awaitHiderAnswer,
        costLabel,
        isSubmitting: session.isBusy,
        onRetry:
          tentacleCenter && tentacleCategoryId
            ? () => void loadPoisForCenter(tentacleCenter, tentacleCategoryId)
            : undefined,
        wizardStepRef,
      }}
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
  const confirmedTentaclePois = filterConfirmedTentaclePois(tentaclePois);

  const readiness: AskHudReadiness = {
    surface: "tentacle",
    placementReady: tentacleCenter !== null,
    configureReady: tentacleCategoryChosen && categorySelectionAvailable,
    resolveReady: confirmedTentaclePois.length > 0 && !tentacleLoading,
    answerReady: awaitHiderAnswer || hasRecordedAnswer,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
    resolving: tentacleLoading && tentacleCenter !== null,
  };

  const mapFirstEligible =
    tentacleCategoryChosen && tentacleCategoryId !== null && categorySelectionAvailable;

  const [eligiblePlacementGeo, setEligiblePlacementGeo] = useState<
    GeolocationPermissionState | "checking"
  >("checking");
  const autoGpsForCategoryRef = useRef<TentacleExtendedCategoryId | null>(null);
  const handleUseGpsRef = useRef(handleUseGps);
  const placementGeo = mapFirstEligible ? eligiblePlacementGeo : "checking";

  useEffect(() => {
    handleUseGpsRef.current = handleUseGps;
  }, [handleUseGps]);

  useEffect(() => {
    if (!mapFirstEligible) {
      autoGpsForCategoryRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const permission = await queryGeolocationPermission();
      if (cancelled) {
        return;
      }
      setEligiblePlacementGeo(permission);
      if (
        permission === "granted" &&
        tentacleCenter === null &&
        autoGpsForCategoryRef.current !== tentacleCategoryId
      ) {
        autoGpsForCategoryRef.current = tentacleCategoryId;
        void handleUseGpsRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapFirstEligible, tentacleCategoryId]);

  useEffect(() => {
    autoGpsForCategoryRef.current = null;
  }, [tentacleCategoryId]);

  const mapPlacementActive = Boolean(mapFirstEligible);
  const placementError =
    tentacleError ?? (tentacleCenter === null ? gpsError : null) ?? mapError ?? null;

  let placementPhase: TentacleMapPlacementPhase;
  if (tentacleCenter !== null && !tentacleLoading) {
    placementPhase = "answer";
  } else if (tentacleCenter !== null && tentacleLoading) {
    placementPhase = "resolving";
  } else if (gpsLoading || placementGeo === "checking") {
    placementPhase = "locating";
  } else if (placementError) {
    placementPhase = "failed";
  } else if (placementGeo === "denied" || placementGeo === "prompt") {
    placementPhase = "needs_permission";
  } else {
    placementPhase = "needs_permission";
  }

  const categoryLabel =
    tentacleCategoryId !== null
      ? (tentacleCategoriesForGameSize(gameSize).find((c) => c.id === tentacleCategoryId)?.label ??
        tentacleCategoryId)
      : "";

  const questionPrompt =
    tentacleCategoryId !== null
      ? tentacleQuestionPrompt(tentacleCategoryId, distanceUnit, searchRadiusMeters)
      : "Pick a location type";

  const reopenCategoryPicker = () => {
    cancelRequests();
    setTentacleLoading(false);
    setTentacleCategoryChosen(false);
    setTentacleCategoryId(null);
    setTentaclePois([]);
    setTentacleOutOfReach(false);
    setSelectedPoiId(null);
    setTentacleError(null);
    setTentacleCenter(null);
  };

  const statusTitle =
    placementPhase === "locating"
      ? "Getting your location"
      : placementPhase === "resolving"
        ? tentaclePois.length > 0
          ? "Confirming places"
          : "Finding places"
        : "Ready";
  const statusBody =
    placementPhase === "locating"
      ? "Waiting for GPS…"
      : placementPhase === "resolving"
        ? tentaclePois.length > 0
          ? `Confirming ${tentaclePois.length} preview${tentaclePois.length === 1 ? "" : "s"}…`
          : `Searching within ${formatDistance(searchRadiusMeters, distanceUnit)}…`
        : categoryLabel;

  const hud = {
    readiness,
    costLabel,
    error: mapPlacementActive ? null : (tentacleError ?? mapError ?? gpsError ?? null),
    onCommit: () => void commit(),
    suppressSheet: mapPlacementActive,
    mapOverlay:
      mapPlacementActive && tentacleCategoryId ? (
        <TentacleMapPlacementChrome
          categoryLabel={categoryLabel}
          questionPrompt={questionPrompt}
          costLabel={costLabel}
          phase={placementPhase}
          onUseGps={() => void handleUseGps()}
          gpsLoading={gpsLoading}
          error={placementError}
          awaitHiderAnswer={awaitHiderAnswer}
          categoryId={tentacleCategoryId}
          distanceUnit={distanceUnit}
          searchRadiusMeters={searchRadiusMeters}
          poiOptions={tentaclePois}
          selectedPoiId={selectedPoiId}
          outOfReach={tentacleOutOfReach}
          onOutOfReachChange={(nextOutOfReach) => {
            setTentacleOutOfReach(nextOutOfReach);
            if (nextOutOfReach) {
              setSelectedPoiId(null);
            }
          }}
          canCommit={askCanCommit(readiness)}
          isSubmitting={session.isBusy}
          onCommit={() => void commit()}
          onChangeCategory={reopenCategoryPicker}
          statusTitle={statusTitle}
          statusBody={statusBody}
        />
      ) : null,
    modeBody: mapPlacementActive ? null : (
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
        costLabel={costLabel}
        toolLabel="Tentacle"
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
