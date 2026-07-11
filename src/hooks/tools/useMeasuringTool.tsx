import { useMemo } from "react";
import { isActive } from "../../domain/map/annotations";
import {
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
} from "../../domain/questions";
import { questionCostBreakdown } from "../../domain/questions";
import { adminBorderKindAvailability } from "../../services/geo/adminDivisionAvailability";
import { firstUnusedCatalogOption } from "../../domain/session/toolSessionOptions";
import type { MeasuringFromKind } from "../../domain/questions";
import { useSubmitLock } from "../useSubmitLock";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MeasuringToolPanel } from "./measuring/MeasuringToolPanel";
import { useMeasuringAnchorLoaders } from "./measuring/useMeasuringAnchorLoaders";
import { useMeasuringCommit } from "./measuring/useMeasuringCommit";
import { useMeasuringDraftState } from "./measuring/useMeasuringDraftState";
import { useMeasuringInteractions } from "./measuring/useMeasuringInteractions";
import {
  useHasMeasuringTarget,
  useMeasuringPlacementCrosshair,
  useMeasuringPreviews,
  useMeasuringPublishSignature,
} from "./measuring/useMeasuringPreviews";
import type { UseMeasuringToolParams } from "./measuring/types";

export type { UseMeasuringToolParams } from "./measuring/types";

export function useMeasuringTool({
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
  setMapError,
  refreshGps,
  ensurePointInGameArea,
  canSubmitQuestion = true,
}: UseMeasuringToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
  const draft = useMeasuringDraftState(annotations, sessionRules);
  const previews = useMeasuringPreviews(gameArea, draft);

  const loaders = useMeasuringAnchorLoaders({
    active,
    gameArea,
    sessionRules,
    setMapError,
    draft,
  });

  const interactions = useMeasuringInteractions({
    active,
    gameArea,
    refreshGps,
    ensurePointInGameArea,
    draft,
    loaders,
  });

  const { commit, performCommit } = useMeasuringCommit({
    annotations,
    pendingQuestions,
    createAnnotation,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    finishPlacement,
    canSubmitQuestion,
    draft,
    previews,
  });

  useToolSessionOptions({
    active: active && draft.measuringOptionChosen,
    usedOptions: draft.usedMeasuringFromKindsSet,
    currentOption: measuringFromKind(
      draft.measuringSubject,
      draft.measuringLocationCategory,
    ),
    isAvailable: (_usedOptions, currentOption) =>
      adminBorderKindAvailability(
        currentOption,
        draft.adminDivisionCounts,
        draft.regionPackId,
      ),
    pickNext: (usedOptions) =>
      firstUnusedCatalogOption<MeasuringFromKind>(
        draft.measuringCatalog,
        usedOptions,
      ),
    onUnavailable: loaders.handleUnavailableMeasuringOption,
  });

  const hasMeasuringTarget = useHasMeasuringTarget(draft);
  const placementCrosshair = useMeasuringPlacementCrosshair(active, draft);
  const publishSignature = useMeasuringPublishSignature(
    draft,
    previews,
    placementCrosshair,
  );

  const questionCost = useMemo(() => {
    const useCount = Math.max(
      measuringFromKindUseCount(
        annotations.filter(isActive),
        draft.measureFromKind,
      ),
      measuringFromKindUseCountFromPending(
        pendingQuestions,
        draft.measureFromKind,
      ),
    );
    return questionCostBreakdown("D3P1", useCount);
  }, [annotations, draft.measureFromKind, pendingQuestions]);

  const panel = (
    <MeasuringToolPanel
      distanceUnit={distanceUnit}
      awaitHiderAnswer={awaitHiderAnswer}
      gpsLoading={gpsLoading}
      gpsError={gpsError}
      mapError={mapError}
      isSubmitting={isSubmitting}
      costLabel={questionCost.label}
      hasMeasuringTarget={hasMeasuringTarget}
      draft={draft}
      loaders={loaders}
      onCommit={() => void runLocked(commit)}
      onPreviewConfirm={() => void runLocked(performCommit)}
      handleGps={interactions.handleGps}
      handleSearch={interactions.handleSearch}
      applySearchResult={interactions.applySearchResult}
      loadNearest={interactions.loadNearest}
    />
  );

  return {
    draft: {
      measuringSeekerPoint: draft.measuringSeekerPoint,
      measuringTargetPoint: draft.measuringTargetPoint,
      measuringPlaces: draft.measuringPlaces,
      measuringDistanceMeters: draft.measuringDistanceMeters,
      measuringBoundaryPreview: previews.measuringBoundaryPreview,
      measuringEliminationPreview: previews.measuringEliminationPreview,
      seekerResolving:
        draft.measuringLoading && draft.measuringSeekerPoint !== null,
    },
    placementCrosshair,
    publishSignature,
    handleMapClick: interactions.handleMapClick,
    resetDraft: draft.resetDraft,
    commit,
    panel,
  };
}
