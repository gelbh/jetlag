import { useCallback, useEffect, useMemo, useRef } from "react";
import { MatchingHudBody } from "@/components/tools/ask/MatchingHudBody";
import { QuestionPreviewSheet } from "@/components/tools/shared/controls/QuestionPreviewSheet";
import { useLatestRequest } from "../forms/useLatestRequest";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";
import { isActive } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  defaultMatchingCategoryId,
  firstAvailableMatchingCategoryId,
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  matchingQuestionFor,
  usedMatchingCategoryIds,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/questions";
import { isAdminDivisionCategoryAvailable } from "../../services/geo/overpass/adminDivisionAvailability";
import { poiCandidateToMatchingFeature } from "@/domain/geo/poiCandidateAdapters";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import { useMapStore } from "@/state/mapStore";
import { useToolSession } from "./framework/useToolSession";
import { useToolSessionOptions } from "./useToolSessionOptions";
import {
  commitMatching,
  performMatchingCommit,
  type CommitMatchingInput,
} from "./matching/commitMatching";
import { MatchingToolPanel } from "./matching/MatchingToolPanel";
import {
  buildResolveMatchingAnchorResult,
  reconcileLockedMatchingNearest,
  resolveMatchingAnchor,
} from "./matching/resolveMatchingAnchor";
import type {
  MatchingSessionConfig,
  UseMatchingToolParams,
} from "./matching/types";
import { useMatchingCatalog } from "./matching/useMatchingCatalog";
import { useMatchingDraftState } from "./matching/useMatchingDraftState";

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
  } = draft;

  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );
  const usedMatchingCategories = useMemo(
    () => usedMatchingCategoryIds(activeAnnotations),
    [activeAnnotations],
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
      setMatchingDistanceMeters,
      setMatchingError,
      setMatchingFeatureCount,
      setMatchingFeatures,
      setMatchingInPlayAreaFeatureCount,
      setMatchingNearestFeatureId,
      setMatchingNearestFeatureName,
      setMatchingNearestFeaturePoint,
      setMatchingNearestOutsidePlayArea,
      setMatchingNullAnswer,
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
            buildResolveMatchingAnchorResult(
              seekerPoint,
              categoryId,
              tilePreview,
            ),
            0,
          );
        }
      }

      const result = await resolveMatchingAnchor({
        seekerPoint,
        categoryId,
        gameArea,
        matchingFetchOptions: catalog.matchingFetchOptions,
        onEnrich: (enriched) => {
          applyResolveResult(requestId, enriched, 1);
        },
      });

      applyResolveResult(requestId, result, 0);
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
    if (
      !active ||
      !debouncedSeekerPoint ||
      !matchingCategoryId ||
      !matchingCategoryChosen
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void resolveForAnchor(debouncedSeekerPoint, matchingCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    active,
    matchingCategoryChosen,
    matchingCategoryId,
    debouncedSeekerPoint,
    resolveForAnchor,
  ]);

  const resetDraft = useCallback(() => {
    cancelRequests();
    resetMatchingDraft();
  }, [cancelRequests, resetMatchingDraft]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active || wizardStepRef.current !== "place") {
        return false;
      }

      const mapStyle = useMapStore.getState().mapStyle;
      const categoryId = matchingCategoryChosen ? matchingCategoryId : null;
      const resolver =
        categoryId != null
          ? getMatchingCategory(categoryId).resolver
          : null;
      const tapHit =
        resolver === "overpassPoint" && categoryId != null
          ? previewBasemapPois({
              mapStyle,
              categoryIds: [categoryId],
              point,
              maxResults: 1,
            })[0]
          : null;

      setMatchingSeekerAnchor(tapHit?.point ?? point);
      return true;
    },
    [
      active,
      matchingCategoryChosen,
      matchingCategoryId,
      setMatchingSeekerAnchor,
    ],
  );

  const handleGps = async () => {
    setMatchingError(null);

    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        setMatchingError("That point is outside the play area.");
        return;
      }

      setMatchingSeekerAnchor(point);
    } catch (error) {
      setMatchingError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

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
      !isMatchingCategoryAvailable(categoryId)
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
    matchingLoading &&
    matchingFeatures.some(
      (feature) => feature.confirmStatus === "provisional",
    );

  const panel = (
    <MatchingToolPanel
      distanceUnit={distanceUnit}
      categoryId={matchingCategoryId}
      categoryChosen={matchingCategoryChosen}
      usedCategoryIds={usedMatchingCategories}
      catalogCategories={catalog.matchingCatalog}
      matchingSeekerPoint={matchingSeekerPoint}
      matchingUsesContainment={catalog.matchingUsesContainment}
      matchingNearestFeatureName={matchingNearestFeatureName}
      matchingDistanceMeters={matchingDistanceMeters}
      matchingFeatureCount={matchingFeatureCount}
      matchingInPlayAreaFeatureCount={matchingInPlayAreaFeatureCount}
      matchingNearestOutsidePlayArea={matchingNearestOutsidePlayArea}
      matchingNullAnswer={matchingNullAnswer}
      matchingLoading={matchingLoading}
      nearestProvisional={nearestProvisional}
      satelliteBasemap={mapStyle === "satellite"}
      gpsLoading={gpsLoading}
      matchingAnswer={matchingAnswer}
      error={matchingError ?? gpsError ?? mapError}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={catalog.costLabel}
      isSubmitting={session.isBusy}
      previewOpen={previewOpen}
      previewQuestion={previewQuestion}
      wizardStepRef={wizardStepRef}
      onCategoryChange={handleCategoryChange}
      onUseGps={() => void handleGps()}
      onAnswerChange={setMatchingAnswerSynced}
      onCommit={() => void commit()}
      onRetry={
        matchingSeekerPoint && matchingCategoryId
          ? () => void resolveForAnchor(matchingSeekerPoint, matchingCategoryId)
          : undefined
      }
      onPreviewConfirm={() =>
        void session.runAction(async () => {
          await performMatchingCommit(buildCommitInput());
        })
      }
      onPreviewCancel={() => setPreviewOpen(false)}
    />
  );

  // Drive map-click routing without mounting MatchingPanel wizard.
  useEffect(() => {
    if (!matchingCategoryChosen) {
      wizardStepRef.current = "category";
      return;
    }
    const resolved =
      matchingNullAnswer || matchingNearestFeatureName !== null;
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
    matchingCategoryId !== null &&
    isMatchingCategoryAvailable(matchingCategoryId);
  const resolveComplete =
    matchingNullAnswer || matchingNearestFeatureName !== null;

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
    error: matchingError ?? gpsError ?? mapError ?? null,
    onCommit: () => void commit(),
    modeBody: (
      <MatchingHudBody
        distanceUnit={distanceUnit}
        categoryId={matchingCategoryId}
        categoryChosen={matchingCategoryChosen}
        usedCategoryIds={usedMatchingCategories}
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
