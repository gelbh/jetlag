import { startTransition, useEffect, useMemo, useRef } from "react";
import { MeasuringHudBody } from "@/components/tools/ask/MeasuringHudBody";
import { QuestionPreviewSheet } from "@/components/tools/shared/controls/QuestionPreviewSheet";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";
import { isActive } from "../../domain/map/annotations";
import {
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
  measuringQuestionFor,
  type MeasuringFromKind,
} from "../../domain/questions";
import { questionCostBreakdown } from "../../domain/questions";
import { firstUnusedCatalogOption } from "../../domain/session/tools/toolSessionOptions";
import { adminBorderKindAvailability } from "../../services/geo/overpass/adminDivisionAvailability";
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

  const measuringSeekerPoint = draft.measuringSeekerPoint;
  const measuringOptionChosen = draft.measuringOptionChosen;
  const setWizardStep = draft.setWizardStep;

  // Drive map-click routing without mounting MeasuringPanel wizard.
  useEffect(() => {
    if (!measuringSeekerPoint) {
      setWizardStep("place");
      return;
    }
    if (!measuringOptionChosen) {
      setWizardStep("source");
      return;
    }
    if (!hasMeasuringTarget) {
      setWizardStep("target");
      return;
    }
    setWizardStep("ask");
  }, [
    hasMeasuringTarget,
    measuringOptionChosen,
    measuringSeekerPoint,
    setWizardStep,
  ]);

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

  const readiness: AskHudReadiness = {
    surface: "measuring",
    placementReady: draft.measuringSeekerPoint !== null,
    configureReady: draft.measuringOptionChosen,
    resolveReady: hasMeasuringTarget,
    answerReady: awaitHiderAnswer || draft.measuringAnswer !== null,
    awaitHiderAnswer,
    isSubmitting: session.isBusy,
    viewOnly: !canSubmitQuestion,
  };

  const hud = {
    readiness,
    costLabel: questionCost.label,
    error: draft.measuringError ?? gpsError ?? mapError ?? null,
    onCommit: () => void commit(),
    modeBody: (
      <MeasuringHudBody
        distanceUnit={distanceUnit}
        optionChosen={draft.measuringOptionChosen}
        usedMeasuringFromKinds={draft.usedMeasuringFromKindsSet}
        catalogOptions={draft.measuringCatalog}
        anchorLat={draft.measuringSeekerPoint?.[0] ?? null}
        anchorLng={draft.measuringSeekerPoint?.[1] ?? null}
        measureFrom={measuringFromKind(
          draft.measuringSubject,
          draft.measuringLocationCategory,
        )}
        subject={draft.measuringSubject}
        targetMode={draft.measuringTargetMode}
        usesAllPlacesInArea={draft.usesAllPlacesInArea}
        hasSeekerPoint={draft.measuringSeekerPoint !== null}
        hasTargetPoint={hasMeasuringTarget}
        anchorAltitudeMeters={draft.measuringAnchorElevationMeters}
        seekerPlaceName={draft.measuringSeekerPlaceName}
        targetPlaceName={draft.measuringTargetPlaceName}
        distanceMeters={draft.measuringDistanceMeters}
        loading={draft.measuringLoading}
        gpsLoading={gpsLoading}
        searchQuery={draft.measuringSearchQuery}
        searchResults={draft.measuringSearchResults}
        searchLoading={draft.measuringSearchLoading}
        searchRole={draft.measuringSearchRole}
        answer={draft.measuringAnswer}
        seaLevelEdgeCase={draft.measuringSeaLevelEdgeCase}
        error={draft.measuringError ?? gpsError ?? mapError}
        onMeasureFromChange={loaders.handleMeasureFromChange}
        onTargetModeChange={loaders.handleTargetModeChange}
        onSearchQueryChange={draft.setMeasuringSearchQuery}
        onSearchSubmit={(role) => void interactions.handleSearch(role)}
        onSearchResultSelect={interactions.applySearchResult}
        onUseGps={() => void interactions.handleGps()}
        onFindCoastline={() => {
          if (draft.measuringSeekerPoint) {
            void loaders.loadMeasuringCoastlineAt(draft.measuringSeekerPoint);
          }
        }}
        onRetrySeaLevel={() => {
          if (draft.measuringSeekerPoint) {
            void loaders.loadSeaLevelContextAt(draft.measuringSeekerPoint);
          }
        }}
        onFindLinearFeature={() => {
          if (draft.measuringSeekerPoint) {
            void loaders.loadMeasuringLinearAt(draft.measuringSeekerPoint);
          }
        }}
        onFindNearest={() => void interactions.loadNearest()}
        onAnswerChange={(answer) => {
          startTransition(() => draft.setMeasuringAnswer(answer));
        }}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={questionCost.label}
        isSubmitting={session.isBusy}
      />
    ),
    sheets: (
      <QuestionPreviewSheet
        open={draft.previewOpen}
        prompt={
          measuringQuestionFor(
            draft.measuringSubject,
            draft.measuringSubject === "location"
              ? draft.measuringLocationCategory
              : undefined,
          ).prompt
        }
        ruleSummary={
          measuringQuestionFor(
            draft.measuringSubject,
            draft.measuringSubject === "location"
              ? draft.measuringLocationCategory
              : undefined,
          ).ruleSummary
        }
        anchorLat={draft.measuringSeekerPoint?.[0] ?? null}
        anchorLng={draft.measuringSeekerPoint?.[1] ?? null}
        costLabel={questionCost.label}
        onConfirm={() =>
          void session.runAction(async () => {
            await performCommitRef.current();
          })
        }
        onCancel={() => draft.setPreviewOpen(false)}
        isSubmitting={session.isBusy}
      />
    ),
  };

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
    hud,
  };
}
