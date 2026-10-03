import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { MeasuringHudBody } from "@/components/tools/ask/measuring/MeasuringHudBody";
import {
  MeasuringMapPlacementChrome,
  type MeasuringMapPlacementPhase,
} from "@/components/tools/ask/measuring/MeasuringMapPlacementChrome";
import { QuestionPreviewSheet } from "@/components/tools/shared/controls/QuestionPreviewSheet";
import { SearchResultsList } from "@/components/tools/shared/controls/SearchResultsList";
import { MeasuringTargetSection } from "@/components/tools/shared/measuring/MeasuringTargetStep";
import { anchorResolveLoadingMessage } from "@/components/tools/shared/measuring/measuringPanelUtils";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import type { AskHudReadiness } from "@/domain/ask/askHudModes";
import { isActive } from "../../domain/map/annotations";
import {
  type MeasuringFromKind,
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
  measuringQuestionFor,
  measuringSupportsSearch,
  measuringTargetLabel,
  questionCostBreakdown,
} from "../../domain/questions";
import { firstUnusedCatalogOption } from "../../domain/session/tools/toolSessionOptions";
import {
  type GeolocationPermissionState,
  queryGeolocationPermission,
} from "../../services/core/location/geolocation";
import { adminBorderKindAvailability } from "../../services/geo/overpass/adminDivisionAvailability";
import { useToolSession } from "./framework/useToolSession";
import { measuringCommitReady } from "./measuring/helpers";
import { MeasuringToolPanel } from "./measuring/MeasuringToolPanel";
import type { UseMeasuringToolParams } from "./measuring/types";
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
import { useToolSessionOptions } from "./useToolSessionOptions";

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
  const activeAnnotations = useMemo(() => annotations.filter(isActive), [annotations]);
  const draft = useMeasuringDraftState(annotations, pendingQuestions, sessionRules);
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
    currentOption: measuringFromKind(draft.measuringSubject, draft.measuringLocationCategory),
    isAvailable: (_usedOptions, currentOption) =>
      adminBorderKindAvailability(currentOption, draft.adminDivisionCounts, draft.regionPackId),
    pickNext: (usedOptions) =>
      firstUnusedCatalogOption<MeasuringFromKind>(draft.measuringCatalog, usedOptions),
    onUnavailable: loaders.handleUnavailableMeasuringOption,
  });

  const hasMeasuringTarget = useHasMeasuringTarget(draft);
  const placementCrosshair = useMeasuringPlacementCrosshair(active, draft);
  const publishSignature = useMeasuringPublishSignature(draft, previews, placementCrosshair);

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
  }, [hasMeasuringTarget, measuringOptionChosen, measuringSeekerPoint, setWizardStep]);

  const questionCost = useMemo(() => {
    const useCount = Math.max(
      measuringFromKindUseCount(activeAnnotations, draft.measureFromKind),
      measuringFromKindUseCountFromPending(pendingQuestions, draft.measureFromKind),
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
    resolving: draft.measuringLoading && draft.measuringSeekerPoint !== null,
  };

  const mapFirstEligible = draft.measuringOptionChosen;

  const autoGpsForOptionRef = useRef<string | null>(null);
  const handleGpsRef = useRef(interactions.handleGps);

  useEffect(() => {
    handleGpsRef.current = interactions.handleGps;
  }, [interactions.handleGps]);

  const measureFromKey = measuringFromKind(draft.measuringSubject, draft.measuringLocationCategory);

  const [eligiblePlacementGeo, setEligiblePlacementGeo] = useState<
    GeolocationPermissionState | "checking"
  >("checking");
  const placementGeo = mapFirstEligible ? eligiblePlacementGeo : "checking";

  useEffect(() => {
    if (!mapFirstEligible) {
      autoGpsForOptionRef.current = null;
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
        draft.measuringSeekerPoint === null &&
        autoGpsForOptionRef.current !== measureFromKey
      ) {
        autoGpsForOptionRef.current = measureFromKey;
        void handleGpsRef.current();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapFirstEligible, measureFromKey]);

  useEffect(() => {
    autoGpsForOptionRef.current = null;
  }, [measureFromKey]);

  const mapPlacementActive = Boolean(mapFirstEligible);
  const placementError =
    draft.measuringError ??
    (draft.measuringSeekerPoint === null ? gpsError : null) ??
    mapError ??
    null;

  const resolveComplete = hasMeasuringTarget && draft.measuringDistanceMeters !== null;

  let placementPhase: MeasuringMapPlacementPhase;
  if (draft.measuringSeekerPoint !== null && resolveComplete && !draft.measuringLoading) {
    placementPhase = "answer";
  } else if (draft.measuringSeekerPoint !== null && (draft.measuringLoading || !resolveComplete)) {
    placementPhase = "resolving";
  } else if (draft.measuringSeekerPoint === null && gpsLoading) {
    placementPhase = "locating";
  } else if (draft.measuringSeekerPoint === null && placementError) {
    placementPhase = "failed";
  } else if (
    draft.measuringSeekerPoint === null &&
    (placementGeo === "prompt" || placementGeo === "denied" || placementGeo === "unavailable")
  ) {
    placementPhase = placementGeo === "prompt" ? "needs_permission" : "failed";
  } else {
    placementPhase = "locating";
  }

  const question = measuringQuestionFor(
    draft.measuringSubject,
    draft.measuringSubject === "location" ? draft.measuringLocationCategory : undefined,
  );
  const configureLabel = measuringTargetLabel(
    draft.measuringSubject,
    draft.measuringSubject === "location" ? draft.measuringLocationCategory : undefined,
  );

  const reopenCatalog = () => {
    draft.reopenCatalog();
  };

  const canCommitMeasuring =
    draft.measuringSeekerPoint !== null &&
    hasMeasuringTarget &&
    draft.measuringOptionChosen &&
    (awaitHiderAnswer || draft.measuringAnswer !== null) &&
    canSubmitQuestion &&
    !session.isBusy &&
    measuringCommitReady({
      measuringSubject: draft.measuringSubject,
      measuringLoading: draft.measuringLoading,
      resolvedCoastSegmentsLength: previews.resolvedCoastSegments.length,
    });

  const locationCategory =
    draft.measuringSubject === "location" ? draft.measuringLocationCategory : undefined;
  const allowsSearch = measuringSupportsSearch(measureFromKey);
  const statusTitle =
    placementPhase === "locating"
      ? "Getting your location"
      : placementPhase === "resolving"
        ? hasMeasuringTarget
          ? "Target found"
          : "Finding target"
        : "Ready";
  const statusBody =
    placementPhase === "locating"
      ? "Waiting for GPS…"
      : placementPhase === "resolving"
        ? (draft.measuringTargetPlaceName ??
          anchorResolveLoadingMessage(draft.measuringSubject, measureFromKey, locationCategory))
        : configureLabel;

  const midSlot =
    draft.measuringSeekerPoint !== null && !resolveComplete && !draft.measuringLoading ? (
      <div
        data-testid="measuring-map-placement-target"
        className="mx-auto w-full max-w-[22rem] max-h-[36dvh] overflow-y-auto"
        style={{
          ...mapChromeSurfaceStyles,
          borderRadius: 14,
          padding: "0.55rem",
          color: "var(--color-field-ink)",
        }}
      >
        <MeasuringTargetSection
          subject={draft.measuringSubject}
          measureFrom={measureFromKey}
          locationCategory={locationCategory}
          usesAllPlacesInArea={draft.usesAllPlacesInArea}
          targetMode={draft.measuringTargetMode}
          hasSeekerPoint={draft.measuringSeekerPoint !== null}
          hasTargetPoint={hasMeasuringTarget}
          targetPlaceName={draft.measuringTargetPlaceName}
          distanceMeters={draft.measuringDistanceMeters}
          anchorAltitudeMeters={draft.measuringAnchorElevationMeters}
          loading={draft.measuringLoading}
          searchQuery={draft.measuringSearchQuery}
          searchLoading={draft.measuringSearchLoading}
          distanceUnit={distanceUnit}
          error={draft.measuringError ?? gpsError ?? mapError}
          anchorLoadingMessage={anchorResolveLoadingMessage(
            draft.measuringSubject,
            measureFromKey,
            locationCategory,
          )}
          onTargetModeChange={loaders.handleTargetModeChange}
          onSearchQueryChange={draft.setMeasuringSearchQuery}
          onSearchSubmit={() => void interactions.handleSearch("target")}
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
        />
        {allowsSearch && draft.measuringSearchResults.length > 0 ? (
          <div className="mt-2 max-h-32 overflow-y-auto">
            <SearchResultsList
              results={draft.measuringSearchResults}
              onSelect={(place) => interactions.applySearchResult(place, "target")}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  const hud = {
    readiness,
    costLabel: questionCost.label,
    error: mapPlacementActive ? null : (draft.measuringError ?? gpsError ?? mapError ?? null),
    onCommit: () => void commit(),
    suppressSheet: mapPlacementActive,
    mapOverlay: mapPlacementActive ? (
      <MeasuringMapPlacementChrome
        configureLabel={configureLabel}
        questionPrompt={question.prompt}
        costLabel={questionCost.label}
        phase={placementPhase}
        onUseGps={() => void interactions.handleGps()}
        error={placementError}
        awaitHiderAnswer={awaitHiderAnswer}
        answer={draft.measuringAnswer}
        onAnswerChange={(answer) => {
          startTransition(() => draft.setMeasuringAnswer(answer));
        }}
        canCommit={canCommitMeasuring}
        isSubmitting={session.isBusy}
        onCommit={() => void commit()}
        onChangeConfigure={reopenCatalog}
        seekerPlaceName={draft.measuringSeekerPlaceName}
        targetPlaceName={draft.measuringTargetPlaceName}
        distanceMeters={draft.measuringDistanceMeters}
        distanceUnit={distanceUnit}
        statusTitle={statusTitle}
        statusBody={statusBody ?? ""}
        midSlot={midSlot}
      />
    ) : null,
    modeBody: mapPlacementActive ? null : (
      <MeasuringHudBody
        model={{
          distanceUnit,
          optionChosen: draft.measuringOptionChosen,
          usedMeasuringFromKinds: draft.usedMeasuringFromKindsSet,
          unavailableMeasuringFromKinds: new Set(draft.unavailableMeasuringFromKinds.keys()),
          catalogNotice: draft.catalogNotice,
          catalogOptions: draft.measuringCatalog,
          anchorLat: draft.measuringSeekerPoint?.[0] ?? null,
          anchorLng: draft.measuringSeekerPoint?.[1] ?? null,
          measureFrom: measureFromKey,
          subject: draft.measuringSubject,
          targetMode: draft.measuringTargetMode,
          usesAllPlacesInArea: draft.usesAllPlacesInArea,
          hasSeekerPoint: draft.measuringSeekerPoint !== null,
          hasTargetPoint: hasMeasuringTarget,
          anchorAltitudeMeters: draft.measuringAnchorElevationMeters,
          seekerPlaceName: draft.measuringSeekerPlaceName,
          targetPlaceName: draft.measuringTargetPlaceName,
          distanceMeters: draft.measuringDistanceMeters,
          loading: draft.measuringLoading,
          gpsLoading,
          searchQuery: draft.measuringSearchQuery,
          searchResults: draft.measuringSearchResults,
          searchLoading: draft.measuringSearchLoading,
          searchRole: draft.measuringSearchRole,
          answer: draft.measuringAnswer,
          seaLevelEdgeCase: draft.measuringSeaLevelEdgeCase,
          error: draft.measuringError ?? gpsError ?? mapError,
          onMeasureFromChange: loaders.handleMeasureFromChange,
          onTargetModeChange: loaders.handleTargetModeChange,
          onSearchQueryChange: draft.setMeasuringSearchQuery,
          onSearchSubmit: (role) => void interactions.handleSearch(role),
          onSearchResultSelect: interactions.applySearchResult,
          onUseGps: () => void interactions.handleGps(),
          onFindCoastline: () => {
            if (draft.measuringSeekerPoint) {
              void loaders.loadMeasuringCoastlineAt(draft.measuringSeekerPoint);
            }
          },
          onRetrySeaLevel: () => {
            if (draft.measuringSeekerPoint) {
              void loaders.loadSeaLevelContextAt(draft.measuringSeekerPoint);
            }
          },
          onFindLinearFeature: () => {
            if (draft.measuringSeekerPoint) {
              void loaders.loadMeasuringLinearAt(draft.measuringSeekerPoint);
            }
          },
          onFindNearest: () => void interactions.loadNearest(),
          onAnswerChange: (answer) => {
            startTransition(() => draft.setMeasuringAnswer(answer));
          },
          awaitHiderAnswer,
          costLabel: questionCost.label,
          isSubmitting: session.isBusy,
          toolLabel: "Measuring",
        }}
      />
    ),
    sheets: (
      <QuestionPreviewSheet
        open={draft.previewOpen}
        prompt={question.prompt}
        ruleSummary={question.ruleSummary}
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
      measuringLodPhase: previews.measuringLodPhase,
      measuringCategoryId: draft.measuringOptionChosen ? measureFromKey : null,
      seekerResolving: draft.measuringLoading && draft.measuringSeekerPoint !== null,
    },
    measuringLodPhase: previews.measuringLodPhase,
    placementCrosshair,
    publishSignature,
    handleMapClick: interactions.handleMapClick,
    resetDraft: draft.resetDraft,
    commit,
    panel,
    hud,
  };
}
