import { useEffect, useMemo, useRef } from "react";
import { isActive } from "../../domain/map/annotations";
import {
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
} from "../../domain/questions";
import { questionCostBreakdown } from "../../domain/questions";
import { adminBorderKindAvailability } from "../../services/geo/overpass/adminDivisionAvailability";
import { firstUnusedCatalogOption } from "../../domain/session/tools/toolSessionOptions";
import type { MeasuringFromKind } from "../../domain/questions";
import { useToolSession } from "./framework/useToolSession";
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

interface MeasuringSessionConfig {
  ready: true;
}

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
  const activeAnnotations = useMemo(
    () => annotations.filter(isActive),
    [annotations],
  );
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

  const { commit: commitMeasuring, performCommit } = useMeasuringCommit({
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

  const commitRef = useRef(commitMeasuring);
  const performCommitRef = useRef(performCommit);

  useEffect(() => {
    commitRef.current = commitMeasuring;
  }, [commitMeasuring]);

  useEffect(() => {
    performCommitRef.current = performCommit;
  }, [performCommit]);

  const session = useToolSession<MeasuringSessionConfig>({
    toolId: "measuring",
    active,
    createInitialConfig: () => ({ ready: true }),
    onSubmit: async () => {
      await commitRef.current();
    },
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
      measuringFromKindUseCount(activeAnnotations, draft.measureFromKind),
      measuringFromKindUseCountFromPending(
        pendingQuestions,
        draft.measureFromKind,
      ),
    );
    return questionCostBreakdown("D3P1", useCount);
  }, [activeAnnotations, draft.measureFromKind, pendingQuestions]);

  const commit = () => session.submit();

  const panel = (
    <MeasuringToolPanel
      distanceUnit={distanceUnit}
      awaitHiderAnswer={awaitHiderAnswer}
      gpsLoading={gpsLoading}
      gpsError={gpsError}
      mapError={mapError}
      isSubmitting={session.isBusy}
      costLabel={questionCost.label}
      hasMeasuringTarget={hasMeasuringTarget}
      draft={draft}
      loaders={loaders}
      onCommit={() => void commit()}
      onPreviewConfirm={() =>
        void session.runAction(async () => {
          await performCommitRef.current();
        })
      }
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
