import { startTransition } from "react";
import { MeasuringPanel } from "../../../components/tools/MeasuringPanel";
import { QuestionPreviewSheet } from "../../../components/tools/shared/QuestionPreviewSheet";
import {
  measuringFromKind,
  measuringQuestionFor,
  type MeasuringAnswer,
} from "../../../domain/questions";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { GeocodedPlace } from "../../../services/geo/geocoding";
import type { MeasuringAnchorLoaders } from "./useMeasuringAnchorLoaders";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

interface MeasuringToolPanelProps {
  distanceUnit: DistanceUnit;
  awaitHiderAnswer: boolean;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  isSubmitting: boolean;
  costLabel: string;
  hasMeasuringTarget: boolean;
  draft: MeasuringDraftState;
  loaders: MeasuringAnchorLoaders;
  onCommit: () => void;
  onPreviewConfirm: () => void;
  handleGps: () => Promise<void>;
  handleSearch: (role: "seeker" | "target") => Promise<void>;
  applySearchResult: (place: GeocodedPlace, role: "seeker" | "target") => void;
  loadNearest: () => Promise<void>;
}

export function MeasuringToolPanel({
  distanceUnit,
  awaitHiderAnswer,
  gpsLoading,
  gpsError,
  mapError,
  isSubmitting,
  costLabel,
  hasMeasuringTarget,
  draft,
  loaders,
  onCommit,
  onPreviewConfirm,
  handleGps,
  handleSearch,
  applySearchResult,
  loadNearest,
}: MeasuringToolPanelProps) {
  const {
    wizardStepRef,
    usedMeasuringFromKindsSet,
    measuringCatalog,
    measuringOptionChosen,
    measuringSeekerPoint,
    measuringSubject,
    measuringLocationCategory,
    measuringTargetMode,
    usesAllPlacesInArea,
    measuringAnchorElevationMeters,
    measuringSeekerPlaceName,
    measuringTargetPlaceName,
    measuringDistanceMeters,
    measuringLoading,
    measuringSearchQuery,
    measuringSearchResults,
    measuringSearchLoading,
    measuringSearchRole,
    measuringAnswer,
    measuringSeaLevelEdgeCase,
    measuringSeaLevelNote,
    measuringError,
    previewOpen,
    setPreviewOpen,
    setMeasuringSearchQuery,
    setMeasuringAnswer,
  } = draft;

  const {
    loadMeasuringCoastlineAt,
    loadSeaLevelContextAt,
    loadMeasuringLinearAt,
    handleMeasureFromChange,
    handleTargetModeChange,
  } = loaders;

  return (
    <>
      <MeasuringPanel
        distanceUnit={distanceUnit}
        optionChosen={measuringOptionChosen}
        usedMeasuringFromKinds={usedMeasuringFromKindsSet}
        catalogOptions={measuringCatalog}
        anchorLat={measuringSeekerPoint?.[0] ?? null}
        anchorLng={measuringSeekerPoint?.[1] ?? null}
        measureFrom={measuringFromKind(
          measuringSubject,
          measuringLocationCategory,
        )}
        subject={measuringSubject}
        targetMode={measuringTargetMode}
        usesAllPlacesInArea={usesAllPlacesInArea}
        hasSeekerPoint={measuringSeekerPoint !== null}
        hasTargetPoint={hasMeasuringTarget}
        anchorAltitudeMeters={measuringAnchorElevationMeters}
        seekerPlaceName={measuringSeekerPlaceName}
        targetPlaceName={measuringTargetPlaceName}
        distanceMeters={measuringDistanceMeters}
        loading={measuringLoading}
        gpsLoading={gpsLoading}
        searchQuery={measuringSearchQuery}
        searchResults={measuringSearchResults}
        searchLoading={measuringSearchLoading}
        searchRole={measuringSearchRole}
        answer={measuringAnswer}
        seaLevelEdgeCase={measuringSeaLevelEdgeCase}
        seaLevelNote={measuringSeaLevelNote}
        error={measuringError ?? gpsError ?? mapError}
        onMeasureFromChange={handleMeasureFromChange}
        onTargetModeChange={handleTargetModeChange}
        onSearchQueryChange={setMeasuringSearchQuery}
        onSearchSubmit={(role) => void handleSearch(role)}
        onSearchResultSelect={applySearchResult}
        onUseGps={() => void handleGps()}
        onFindCoastline={() => {
          if (measuringSeekerPoint) {
            void loadMeasuringCoastlineAt(measuringSeekerPoint);
          }
        }}
        onRetrySeaLevel={() => {
          if (measuringSeekerPoint) {
            void loadSeaLevelContextAt(measuringSeekerPoint);
          }
        }}
        onFindLinearFeature={() => {
          if (measuringSeekerPoint) {
            void loadMeasuringLinearAt(measuringSeekerPoint);
          }
        }}
        onFindNearest={() => void loadNearest()}
        onAnswerChange={(answer: MeasuringAnswer) => {
          startTransition(() => setMeasuringAnswer(answer));
        }}
        onCommit={onCommit}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={costLabel}
        isSubmitting={isSubmitting}
        wizardStepRef={wizardStepRef}
      />
      <QuestionPreviewSheet
        open={previewOpen}
        prompt={
          measuringQuestionFor(
            measuringSubject,
            measuringSubject === "location"
              ? measuringLocationCategory
              : undefined,
          ).prompt
        }
        ruleSummary={
          measuringQuestionFor(
            measuringSubject,
            measuringSubject === "location"
              ? measuringLocationCategory
              : undefined,
          ).ruleSummary
        }
        anchorLat={measuringSeekerPoint?.[0] ?? null}
        anchorLng={measuringSeekerPoint?.[1] ?? null}
        costLabel={costLabel}
        onConfirm={onPreviewConfirm}
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
