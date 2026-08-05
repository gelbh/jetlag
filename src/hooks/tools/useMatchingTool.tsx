import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLatestRequest } from "../forms/useLatestRequest";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import { isActive } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  defaultMatchingCategoryId,
  firstAvailableMatchingCategoryId,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  matchingQuestionFor,
  usedMatchingCategoryIds,
  type MatchingCategoryId,
} from "../../domain/questions";
import { isAdminDivisionCategoryAvailable } from "../../services/geo/overpass/adminDivisionAvailability";
import { useToolSession } from "./framework/useToolSession";
import { useToolSessionOptions } from "./useToolSessionOptions";
import {
  commitMatching,
  performMatchingCommit,
  type CommitMatchingInput,
} from "./matching/commitMatching";
import { MatchingToolPanel } from "./matching/MatchingToolPanel";
import {
  resolveMatchingAnchor,
  shouldApplyMatchingAnchorPhase,
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
  useEffect(() => {
    matchingAnswerRef.current = matchingAnswer;
  }, [matchingAnswer]);

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
      if (!shouldApplyMatchingAnchorPhase(lastPhase, phase)) {
        return;
      }
      matchingApplyPhaseRef.current.set(requestId, phase);

      // Keep yes/no once chosen; enrich only refreshes the feature list.
      if (matchingAnswerRef.current !== null && phase === 1) {
        if (result.features.length > 0) {
          setMatchingError(null);
          setMatchingFeatures(result.features);
          setMatchingFeatureCount(result.featureCount);
          setMatchingInPlayAreaFeatureCount(result.inPlayAreaFeatureCount);
        }
        return;
      }

      setMatchingFeatures(result.features);
      setMatchingFeatureCount(result.featureCount);
      setMatchingInPlayAreaFeatureCount(result.inPlayAreaFeatureCount);
      setMatchingNearestFeatureId(result.nearestFeatureId);
      setMatchingNearestFeatureName(result.nearestFeatureName);
      setMatchingNearestFeaturePoint(result.nearestFeaturePoint);
      setMatchingDistanceMeters(result.distanceMeters);
      setMatchingNearestOutsidePlayArea(result.nearestOutsidePlayArea);
      setMatchingNullAnswer(result.nullAnswer);
      if (phase === 0) {
        setMatchingAnswer(null);
      }
      setMatchingError(result.error);
    },
    [
      isLatestRequest,
      setMatchingAnswer,
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
      matchingApplyPhaseRef.current.delete(requestId);
      setMatchingLoading(true);
      setMatchingError(null);

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

      setMatchingSeekerAnchor(point);
      return true;
    },
    [active, setMatchingSeekerAnchor],
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
      onAnswerChange={setMatchingAnswer}
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

  return {
    draft: {
      matchingSeekerPoint,
      matchingNearestFeaturePoint,
      matchingBoundaryPreview: catalog.matchingBoundaryPreview,
      matchingEliminationPreview: catalog.matchingEliminationPreview,
      seekerResolving: matchingLoading && matchingSeekerPoint !== null,
    },
    placementCrosshair: active && matchingSeekerPoint === null,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
