import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MatchingHudBody } from "@/components/tools/ask/matching/MatchingHudBody";
import {
  MatchingMapPlacementChrome,
  type MatchingMapPlacementPhase,
} from "@/components/tools/ask/matching/MatchingMapPlacementChrome";
import { QuestionPreviewSheet } from "@/components/tools/shared/controls/QuestionPreviewSheet";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";
import { canCommit as askCanCommit } from "@/domain/ask/askHudModes";
import { poiCandidateToMatchingFeature } from "@/domain/geo/poiCandidateAdapters";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import { useMapStore } from "@/state/mapStore";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { isActive } from "../../domain/map/annotations";
import { formatDistance } from "../../domain/map/distance";
import {
  defaultMatchingCategoryId,
  firstAvailableMatchingCategoryId,
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  type MatchingAnswer,
  type MatchingCategoryId,
  matchingQuestionFor,
  usedMatchingCategoryIdsForSession,
} from "../../domain/questions";
import {
  type GeolocationPermissionState,
  queryGeolocationPermission,
} from "../../services/core/location/geolocation";
import {
  matchingEmptyPlayAreaMessage,
  matchingFeatureCountLabel,
} from "../../services/geo/matching";
import { isAdminDivisionCategoryAvailable } from "../../services/geo/overpass/adminDivisionAvailability";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import { useLatestRequest } from "../forms/useLatestRequest";
import { useToolSession } from "./framework/useToolSession";
import {
  type CommitMatchingInput,
  commitMatching,
  performMatchingCommit,
} from "./matching/commitMatching";
import { MatchingToolPanel } from "./matching/MatchingToolPanel";
import {
  buildResolveMatchingAnchorResult,
  reconcileLockedMatchingNearest,
  resolveMatchingAnchor,
} from "./matching/resolveMatchingAnchor";
import type { MatchingSessionConfig, UseMatchingToolParams } from "./matching/types";
import { useMatchingCatalog } from "./matching/useMatchingCatalog";
import { useMatchingDraftState } from "./matching/useMatchingDraftState";
import { useToolSessionOptions } from "./useToolSessionOptions";

export type { UseMatchingToolParams } from "./matching/types";

export function useMatchingTool({
  active,
  annotations,
  pendingQuestions = [],
  gameArea,
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  sessionRules,
  distanceUnit,
  finishPlacement,
  gpsLoading,
  gpsError,
  mapError,
  refreshGps,
  ensurePointInGameArea,
  canSubmitQuestion = true,
}: UseMatchingToolParams) {
  const wizardStepRef = useRef("place");
  const finishPlacementRef = useRef(finishPlacement);
  const mapStyle = useMapStore((state) => state.mapStyle);
  useEffect(() => {
    finishPlacementRef.current = finishPlacement;
  }, [finishPlacement]);

  const draft = useMatchingDraftState();
  const {
    matchingSeekerPoint,
    matchingCategoryId,
    matchingCategoryChosen,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNearestFeatureName,
    matchingNearestFeaturePoint,
    matchingDistanceMeters,
    matchingFeatureCount,
    matchingInPlayAreaFeatureCount,
    matchingNearestOutsidePlayArea,
    matchingNullAnswer,
    matchingAnswer,
    matchingLoading,
    matchingError,
    previewOpen,
    unavailableMatchingCategories,
    catalogNotice,
    setUnavailableMatchingCategories,
    setCatalogNotice,
    setMatchingFeatures,
    setMatchingNearestFeatureId,
    setMatchingNearestFeatureName,
    setMatchingNearestFeaturePoint,
    setMatchingDistanceMeters,
    setMatchingFeatureCount,
    setMatchingInPlayAreaFeatureCount,
    setMatchingNearestOutsidePlayArea,
    setMatchingNullAnswer,
    setMatchingAnswer,
    setMatchingLoading,
    setMatchingError,
    setPreviewOpen,
    setMatchingSeekerAnchor,
    resetDraft: resetMatchingDraft,
    selectCategory,
    reopenCategoryPicker,
  } = draft;

  const unavailableCategoryIds = useMemo(
    () => new Set(unavailableMatchingCategories.keys()),
    [unavailableMatchingCategories],
  );

  const activeAnnotations = useMemo(() => annotations.filter(isActive), [annotations]);
  const usedMatchingCategories = useMemo(
    () => usedMatchingCategoryIdsForSession(activeAnnotations, pendingQuestions),
    [activeAnnotations, pendingQuestions],
  );

  const catalog = useMatchingCatalog({
    activeAnnotations,
    pendingQuestions,
    matchingCategoryId,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNullAnswer,
    matchingAnswer,
    gameArea,
    sessionRules,
  });

  useToolSessionOptions({
    active: active && matchingCategoryId !== null,
    usedOptions: usedMatchingCategories,
    currentOption: matchingCategoryId ?? defaultMatchingCategoryId(),
    isAvailable: (_usedOptions, currentOption) =>
      isMatchingCategoryAvailable(currentOption) &&
      isAdminDivisionCategoryAvailable(
        currentOption,
        catalog.adminDivisionCounts,
        catalog.regionPackId,
      ),
    pickNext: firstAvailableMatchingCategoryId,
    onUnavailable: selectCategory,
  });

  const { beginRequest, cancelRequests, isLatestRequest } = useLatestRequest();
  const matchingApplyPhaseRef = useRef(new Map<number, number>());
  const matchingAnswerRef = useRef(matchingAnswer);
  const matchingNearestFeatureIdRef = useRef(matchingNearestFeatureId);
  const matchingNearestFeatureNameRef = useRef(matchingNearestFeatureName);

  useEffect(() => {
    matchingAnswerRef.current = matchingAnswer;
  }, [matchingAnswer]);

  const setMatchingAnswerSynced = useCallback(
    (answer: MatchingAnswer | null) => {
      matchingAnswerRef.current = answer;
      setMatchingAnswer(answer);
    },
    [setMatchingAnswer],
  );

  const publishSignature = useMemo(
    () =>
      [
        matchingSeekerPoint?.[0],
        matchingSeekerPoint?.[1],
        matchingNearestFeatureId,
        matchingNearestFeatureName,
        matchingAnswer,
        matchingNullAnswer,
        matchingLoading,
        matchingError,
        matchingFeatureCount,
        catalog.matchingBoundaryPreview ? "b" : "",
        catalog.matchingEliminationPreview ? "e" : "",
      ].join("|"),
    [
      catalog.matchingBoundaryPreview,
      catalog.matchingEliminationPreview,
      matchingAnswer,
      matchingError,
      matchingFeatureCount,
      matchingLoading,
      matchingNearestFeatureId,
      matchingNearestFeatureName,
      matchingNullAnswer,
      matchingSeekerPoint,
    ],
  );

  const applyResolveResult = useCallback(
    (
      requestId: number,
      result: Awaited<ReturnType<typeof resolveMatchingAnchor>>,
      phase: 0 | 1,
      categoryId: MatchingCategoryId,
    ) => {
      if (!isLatestRequest(requestId)) {
        return;
      }

      const lastPhase = matchingApplyPhaseRef.current.get(requestId) ?? -1;
      if (phase < lastPhase) {
        return;
      }
      matchingApplyPhaseRef.current.set(requestId, phase);

      // Keep yes/no once chosen; enrich only refreshes the list (remap nearest id).
      if (matchingAnswerRef.current !== null) {
        if (result.features.length === 0) {
          return;
        }

        const reconciled = reconcileLockedMatchingNearest(
          result.features,
          matchingNearestFeatureIdRef.current,
          matchingNearestFeatureNameRef.current,
        );
        if (!reconciled) {
          return;
        }

        matchingNearestFeatureIdRef.current = reconciled.nearestFeatureId;
        matchingNearestFeatureNameRef.current = reconciled.nearestFeatureName;
        setMatchingError(null);
        setMatchingFeatures(result.features);
        setMatchingFeatureCount(result.featureCount);
        setMatchingInPlayAreaFeatureCount(result.inPlayAreaFeatureCount);
        setMatchingNearestFeatureId(reconciled.nearestFeatureId);
        setMatchingNearestFeatureName(reconciled.nearestFeatureName);
        setMatchingNearestFeaturePoint(reconciled.nearestFeaturePoint);
        return;
      }

      // Empty play-area catalog: grey the option and reopen the sheet.
      // Pin miss with features still present must not bounce.
      if (result.nullAnswer === true && result.featureCount === 0) {
        const notice = matchingEmptyPlayAreaMessage(categoryId);
        setUnavailableMatchingCategories((prev) => {
          const next = new Map(prev);
          next.set(categoryId, notice);
          return next;
        });
        setCatalogNotice(notice);
        setMatchingLoading(false);
        reopenCategoryPicker();
        return;
      }

      matchingNearestFeatureIdRef.current = result.nearestFeatureId;
      matchingNearestFeatureNameRef.current = result.nearestFeatureName;
      setMatchingFeatures(result.features);
      setMatchingFeatureCount(result.featureCount);
      setMatchingInPlayAreaFeatureCount(result.inPlayAreaFeatureCount);
      setMatchingNearestFeatureId(result.nearestFeatureId);
      setMatchingNearestFeatureName(result.nearestFeatureName);
      setMatchingNearestFeaturePoint(result.nearestFeaturePoint);
      setMatchingDistanceMeters(result.distanceMeters);
      setMatchingNearestOutsidePlayArea(result.nearestOutsidePlayArea);
      setMatchingNullAnswer(result.nullAnswer);
      setMatchingError(result.error);
    },
    [
      isLatestRequest,
      reopenCategoryPicker,
      setCatalogNotice,
      setMatchingDistanceMeters,
      setMatchingError,
      setMatchingFeatureCount,
      setMatchingFeatures,
      setMatchingInPlayAreaFeatureCount,
      setMatchingLoading,
      setMatchingNearestFeatureId,
      setMatchingNearestFeatureName,
      setMatchingNearestFeaturePoint,
      setMatchingNearestOutsidePlayArea,
      setMatchingNullAnswer,
      setUnavailableMatchingCategories,
    ],
  );

  const resolveForAnchor = useCallback(
    async (seekerPoint: LatLngTuple, categoryId: MatchingCategoryId) => {
      const requestId = beginRequest();
      matchingApplyPhaseRef.current.set(requestId, -1);
      setMatchingLoading(true);
      setMatchingError(null);

      const category = getMatchingCategory(categoryId);
      if (category.resolver === "overpassPoint") {
        const tilePreview = previewBasemapPois({
          mapStyle: useMapStore.getState().mapStyle,
          categoryIds: [categoryId],
          maxResults: 48,
        }).map(poiCandidateToMatchingFeature);
        if (tilePreview.length > 0) {
          applyResolveResult(
            requestId,
            buildResolveMatchingAnchorResult(seekerPoint, categoryId, tilePreview),
            0,
            categoryId,
          );
        }
      }

      const result = await resolveMatchingAnchor({
        seekerPoint,
        categoryId,
        gameArea,
        matchingFetchOptions: catalog.matchingFetchOptions,
        onEnrich: (enriched) => {
          applyResolveResult(requestId, enriched, 1, categoryId);
        },
      });

      applyResolveResult(requestId, result, 0, categoryId);
      if (isLatestRequest(requestId)) {
        setMatchingLoading(false);
      }
    },
    [
      applyResolveResult,
      beginRequest,
      catalog.matchingFetchOptions,
      gameArea,
      isLatestRequest,
      setMatchingError,
      setMatchingLoading,
    ],
  );

  const debouncedSeekerPoint = useDebouncedValue(matchingSeekerPoint, 400);

  useEffect(() => {
    if (!active || !debouncedSeekerPoint || !matchingCategoryId || !matchingCategoryChosen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void resolveForAnchor(debouncedSeekerPoint, matchingCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [active, matchingCategoryChosen, matchingCategoryId, debouncedSeekerPoint, resolveForAnchor]);

  const resetDraft = useCallback(() => {
    cancelRequests();
    resetMatchingDraft();
  }, [cancelRequests, resetMatchingDraft]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      const wizardStep = wizardStepRef.current;
      if (!active || (wizardStep !== "place" && wizardStep !== "ask")) {
        return false;
      }

      const mapStyle = useMapStore.getState().mapStyle;
      const categoryId = matchingCategoryChosen ? matchingCategoryId : null;
      const resolver = categoryId != null ? getMatchingCategory(categoryId).resolver : null;
      const tapHit =
        resolver === "overpassPoint" && categoryId != null
          ? previewBasemapPois({
              mapStyle,
              categoryIds: [categoryId],
              point,
              maxResults: 1,
            })[0]
          : null;

      setMatchingAnswerSynced(null);
      setMatchingSeekerAnchor(tapHit?.point ?? point);
      return true;
    },
    [
      active,
      matchingCategoryChosen,
      matchingCategoryId,
      setMatchingAnswerSynced,
      setMatchingSeekerAnchor,
    ],
  );

  const handleGps = useCallback(async () => {
    setMatchingError(null);

    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        setMatchingError("That point is outside the play area.");
        return;
      }

      setMatchingAnswerSynced(null);
      setMatchingSeekerAnchor(point);
    } catch (error) {
      setMatchingError(error instanceof Error ? error.message : "GPS location unavailable.");
    }
  }, [
    ensurePointInGameArea,
    refreshGps,
    setMatchingAnswerSynced,
    setMatchingError,
    setMatchingSeekerAnchor,
  ]);

  const handleGpsRef = useRef(handleGps);

  useEffect(() => {
    handleGpsRef.current = handleGps;
  }, [handleGps]);

  const buildCommitInput = useCallback((): CommitMatchingInput => {
    return {
      canSubmitQuestion,
      matchingSeekerPoint,
      matchingCategoryId,
      matchingNullAnswer,
      matchingNearestFeatureId,
      matchingNearestFeatureName,
      matchingNearestFeaturePoint,
      matchingDistanceMeters,
      matchingFeatureCount,
      matchingFeatures,
      matchingAnswer,
      matchingTransitMetroId: catalog.matchingTransitMetroId,
      previewBeforeSend: catalog.previewBeforeSend,
      customCategories: catalog.customCategories,
      gameArea,
      awaitHiderAnswer,
      submitPendingQuestion,
      sessionId,
      senderUid,
      cardDraw: catalog.cardDraw,
      cardKeep: catalog.cardKeep,
      createAnnotation,
      setMatchingError,
      setPreviewOpen,
      onSuccess: () => {
        resetDraft();
        finishPlacementRef.current();
      },
    };
  }, [
    awaitHiderAnswer,
    canSubmitQuestion,
    catalog.cardDraw,
    catalog.cardKeep,
    catalog.customCategories,
    catalog.matchingTransitMetroId,
    catalog.previewBeforeSend,
    createAnnotation,
    gameArea,
    matchingAnswer,
    matchingCategoryId,
    matchingDistanceMeters,
    matchingFeatureCount,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNearestFeatureName,
    matchingNearestFeaturePoint,
    matchingNullAnswer,
    matchingSeekerPoint,
    resetDraft,
    senderUid,
    sessionId,
    setMatchingError,
    setPreviewOpen,
    submitPendingQuestion,
  ]);

  const session = useToolSession<MatchingSessionConfig>({
    toolId: "matching",
    active,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      await commitMatching(buildCommitInput());
    },
  });

  const commit = () => session.submit();

  const handleCategoryChange = (categoryId: MatchingCategoryId) => {
    if (
      !isMatchingCategoryEnabled(categoryId) ||
      !isMatchingCategoryAvailable(categoryId) ||
      unavailableCategoryIds.has(categoryId) ||
      usedMatchingCategories.has(categoryId)
    ) {
      return;
    }

    selectCategory(categoryId);
  };

  const previewQuestion =
    matchingCategoryId !== null
      ? matchingQuestionFor(matchingCategoryId, catalog.customCategories)
      : null;

  const nearestProvisional =
    matchingLoading && matchingFeatures.some((feature) => feature.confirmStatus === "provisional");

  const panel = (
    <MatchingToolPanel
      model={{
        distanceUnit,
        categoryId: matchingCategoryId,
        categoryChosen: matchingCategoryChosen,
        usedCategoryIds: usedMatchingCategories,
        unavailableCategoryIds,
        catalogNotice,
        catalogCategories: catalog.matchingCatalog,
        matchingSeekerPoint,
        matchingUsesContainment: catalog.matchingUsesContainment,
        matchingNearestFeatureName,
        matchingDistanceMeters,
        matchingFeatureCount,
        matchingInPlayAreaFeatureCount,
        matchingNearestOutsidePlayArea,
        matchingNullAnswer,
        matchingLoading,
        nearestProvisional,
        satelliteBasemap: mapStyle === "satellite",
        gpsLoading,
        matchingAnswer,
        error: matchingError ?? gpsError ?? mapError,
        awaitHiderAnswer,
        costLabel: catalog.costLabel,
        isSubmitting: session.isBusy,
        previewOpen,
        previewQuestion,
        wizardStepRef,
        onCategoryChange: handleCategoryChange,
        onUseGps: () => void handleGps(),
        onAnswerChange: setMatchingAnswerSynced,
        onCommit: () => void commit(),
        onRetry:
          matchingSeekerPoint && matchingCategoryId
            ? () => void resolveForAnchor(matchingSeekerPoint, matchingCategoryId)
            : undefined,
        onPreviewConfirm: () =>
          void session.runAction(async () => {
            await performMatchingCommit(buildCommitInput());
          }),
        onPreviewCancel: () => setPreviewOpen(false),
      }}
    />
  );

  // Drive map-click routing without mounting MatchingPanel wizard.
  useEffect(() => {
    if (!matchingCategoryChosen) {
      wizardStepRef.current = "category";
      return;
    }
    const resolved = matchingNullAnswer || matchingNearestFeatureName !== null;
    if (!matchingSeekerPoint || matchingLoading || !resolved) {
      wizardStepRef.current = "place";
      return;
    }
    wizardStepRef.current = "ask";
  }, [
    matchingCategoryChosen,
    matchingLoading,
    matchingNearestFeatureName,
    matchingNullAnswer,
    matchingSeekerPoint,
  ]);

  const categoryAvailable =
    matchingCategoryId !== null && isMatchingCategoryAvailable(matchingCategoryId);
  const resolveComplete = matchingNullAnswer || matchingNearestFeatureName !== null;

  const mapFirstEligible = matchingCategoryChosen && matchingCategoryId !== null;

  const [eligiblePlacementGeo, setEligiblePlacementGeo] = useState<
    GeolocationPermissionState | "checking"
  >("checking");
  const autoGpsForCategoryRef = useRef<MatchingCategoryId | null>(null);
  const placementGeo = mapFirstEligible ? eligiblePlacementGeo : "checking";

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
        matchingSeekerPoint === null &&
        autoGpsForCategoryRef.current !== matchingCategoryId
      ) {
        autoGpsForCategoryRef.current = matchingCategoryId;
        void handleGpsRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
    // matchingSeekerPoint intentionally omitted: only gate auto-GPS at entry
  }, [mapFirstEligible, matchingCategoryId]);

  useEffect(() => {
    autoGpsForCategoryRef.current = null;
  }, [matchingCategoryId]);

  // Stay map-first for the whole post-category flow (locate → resolve → answer/send).
  const mapPlacementActive = Boolean(mapFirstEligible);

  // Drop stale GPS errors once an anchor exists (map tap or later successful fix).
  const placementError =
    matchingError ?? (matchingSeekerPoint === null ? gpsError : null) ?? mapError ?? null;
  const categoryDef = matchingCategoryId !== null ? getMatchingCategory(matchingCategoryId) : null;
  const usesContainmentMatching = catalog.matchingUsesContainment;
  const usesLandmassMatching = categoryDef?.resolver === "landmass";

  const nearestFeatureSummary = matchingNearestFeatureName
    ? `${matchingNearestFeatureName}${
        !usesContainmentMatching &&
        matchingDistanceMeters !== null &&
        !matchingNearestOutsidePlayArea
          ? ` · ${formatDistance(matchingDistanceMeters, distanceUnit)}`
          : ""
      }${matchingNearestOutsidePlayArea ? " (outside play area)" : ""}`
    : null;

  const featureCountLabel =
    matchingFeatureCount !== null && matchingInPlayAreaFeatureCount !== null
      ? matchingFeatureCountLabel(
          matchingFeatureCount,
          matchingInPlayAreaFeatureCount,
          usesContainmentMatching,
          usesLandmassMatching,
        )
      : null;

  const answerNearestSummary = nearestFeatureSummary
    ? featureCountLabel
      ? `${nearestFeatureSummary} · ${featureCountLabel}`
      : nearestFeatureSummary
    : null;

  let placementPhase: MatchingMapPlacementPhase;
  if (matchingSeekerPoint !== null && resolveComplete && !matchingLoading) {
    placementPhase = "answer";
  } else if (matchingSeekerPoint !== null && (matchingLoading || !resolveComplete)) {
    placementPhase = "resolving";
  } else if (matchingSeekerPoint === null && gpsLoading) {
    placementPhase = "locating";
  } else if (matchingSeekerPoint === null && placementError) {
    placementPhase = "failed";
  } else if (
    matchingSeekerPoint === null &&
    (placementGeo === "prompt" || placementGeo === "denied" || placementGeo === "unavailable")
  ) {
    placementPhase = placementGeo === "prompt" ? "needs_permission" : "failed";
  } else {
    placementPhase = "locating";
  }

  const placementCategoryLabel = categoryDef?.label ?? "";
  const placementQuestionPrompt =
    matchingCategoryId !== null
      ? matchingQuestionFor(matchingCategoryId, catalog.customCategories).prompt
      : "";

  const readiness: AskHudReadiness = {
    surface: "matching",
    placementReady: matchingSeekerPoint !== null,
    configureReady: matchingCategoryChosen && categoryAvailable,
    resolveReady: resolveComplete && !matchingLoading,
    answerReady: awaitHiderAnswer || matchingAnswer !== null,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const hud = {
    readiness,
    costLabel: catalog.costLabel,
    error: placementError,
    onCommit: () => void commit(),
    suppressSheet: mapPlacementActive,
    mapOverlay: mapPlacementActive ? (
      <MatchingMapPlacementChrome
        categoryLabel={placementCategoryLabel}
        questionPrompt={placementQuestionPrompt}
        costLabel={catalog.costLabel}
        phase={placementPhase}
        onUseGps={() => void handleGps()}
        gpsLoading={gpsLoading}
        error={placementError}
        nearestPlaceName={matchingNearestFeatureName}
        awaitHiderAnswer={awaitHiderAnswer}
        nearestSummary={answerNearestSummary}
        nullAnswerMessage={
          matchingNullAnswer && matchingCategoryId
            ? matchingEmptyPlayAreaMessage(matchingCategoryId)
            : null
        }
        answer={matchingAnswer}
        onAnswerChange={setMatchingAnswerSynced}
        canCommit={askCanCommit(readiness)}
        isSubmitting={session.isBusy}
        onCommit={() => void commit()}
        onChangeCategory={reopenCategoryPicker}
      />
    ) : null,
    modeBody: mapPlacementActive ? null : (
      <MatchingHudBody
        distanceUnit={distanceUnit}
        categoryId={matchingCategoryId}
        categoryChosen={matchingCategoryChosen}
        usedCategoryIds={usedMatchingCategories}
        unavailableCategoryIds={unavailableCategoryIds}
        catalogNotice={catalogNotice}
        catalogCategories={catalog.matchingCatalog}
        hasSeekerPoint={matchingSeekerPoint !== null}
        usesContainmentMatching={catalog.matchingUsesContainment}
        nearestFeatureName={matchingNearestFeatureName}
        distanceMeters={matchingDistanceMeters}
        featureCount={matchingFeatureCount}
        inPlayAreaFeatureCount={matchingInPlayAreaFeatureCount}
        nearestOutsidePlayArea={matchingNearestOutsidePlayArea}
        nullAnswer={matchingNullAnswer}
        loading={matchingLoading}
        nearestProvisional={nearestProvisional}
        gpsLoading={gpsLoading}
        answer={matchingAnswer}
        error={matchingError ?? gpsError ?? mapError}
        onCategoryChange={handleCategoryChange}
        onUseGps={() => void handleGps()}
        onAnswerChange={setMatchingAnswerSynced}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={catalog.costLabel}
        toolLabel="Matching"
      />
    ),
    sheets: (
      <QuestionPreviewSheet
        open={previewOpen}
        prompt={previewQuestion?.prompt ?? ""}
        ruleSummary={previewQuestion?.ruleSummary}
        anchorLat={matchingSeekerPoint?.[0] ?? null}
        anchorLng={matchingSeekerPoint?.[1] ?? null}
        costLabel={catalog.costLabel}
        onConfirm={() =>
          void session.runAction(async () => {
            await performMatchingCommit(buildCommitInput());
          })
        }
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={session.isBusy}
      />
    ),
  };

  return {
    draft: {
      matchingSeekerPoint,
      matchingNearestFeaturePoint,
      matchingBoundaryPreview: catalog.matchingBoundaryPreview,
      matchingEliminationPreview: catalog.matchingEliminationPreview,
      matchingLodPhase: catalog.matchingLodPhase,
      matchingCatalogComplete: !matchingLoading,
      matchingCategoryId,
      seekerResolving: matchingLoading && matchingSeekerPoint !== null,
    },
    matchingLodPhase: catalog.matchingLodPhase,
    matchingCatalogComplete: !matchingLoading,
    placementCrosshair: active && matchingSeekerPoint === null,
    publishSignature,
    handleMapClick,
    resetDraft,
    commit,
    panel,
    hud,
  };
}
