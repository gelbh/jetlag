import { type RefObject } from "react";
import {
  MEASURING_CATALOG,
  MEASURING_GROUPS,
  measuringSupportsSearch,
  measuringTargetKind,
  measuringTargetLabel,
  type MeasuringAnswer,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/questions";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import type { SeaLevelEdgeCase } from "../../domain/geometry/seaLevel";
import { type DistanceUnit } from "../../domain/map/distance";
import { InlineError } from "../ui/InlineError";
import { MeasuringAnchorStep } from "./shared/MeasuringAnchorStep";
import {
  MeasuringAnswerSection,
  MeasuringTargetSection,
} from "./shared/MeasuringTargetStep";
import { MeasuringSourceStep } from "./shared/MeasuringSourceStep";
import {
  anchorResolveLoadingMessage,
  measuringUsesDebouncedSeekerResolve,
  type MeasuringSearchRole,
} from "./shared/measuringPanelUtils";
import { SearchResultsList } from "./shared/SearchResultsList";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { MEASURING_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/toolWizardGuards";
import { useToolWizard } from "../../hooks/useToolWizard";

interface MeasuringPanelProps {
  distanceUnit: DistanceUnit;
  optionChosen: boolean;
  measureFrom: MeasuringFromKind;
  usesAllPlacesInArea: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
  catalogOptions?: readonly MeasuringCatalogOption[];
  anchorLat?: number | null;
  anchorLng?: number | null;
  subject: MeasuringSubject;
  targetMode: MeasuringTargetMode;
  anchorAltitudeMeters: number | null;
  hasSeekerPoint: boolean;
  hasTargetPoint: boolean;
  seekerPlaceName: string | null;
  targetPlaceName: string | null;
  distanceMeters: number | null;
  loading: boolean;
  gpsLoading: boolean;
  searchQuery: string;
  searchResults: GeocodedPlace[];
  searchLoading: boolean;
  searchRole: MeasuringSearchRole;
  answer: MeasuringAnswer | null;
  seaLevelEdgeCase?: SeaLevelEdgeCase | null;
  seaLevelNote?: string | null;
  error?: string | null;
  onMeasureFromChange: (kind: MeasuringFromKind) => void;
  onTargetModeChange: (mode: MeasuringTargetMode) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (role: MeasuringSearchRole) => void;
  onSearchResultSelect: (
    place: GeocodedPlace,
    role: MeasuringSearchRole,
  ) => void;
  onUseGps: () => void;
  onFindCoastline: () => void;
  onRetrySeaLevel: () => void;
  onFindLinearFeature: () => void;
  onFindNearest: () => void;
  onAnswerChange: (answer: MeasuringAnswer) => void;
  onCommit: () => void;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  wizardStepRef?: RefObject<string>;
}

export function MeasuringPanel({
  distanceUnit,
  optionChosen,
  measureFrom,
  usesAllPlacesInArea,
  usedMeasuringFromKinds,
  catalogOptions,
  anchorLat = null,
  anchorLng = null,
  subject,
  targetMode,
  anchorAltitudeMeters,
  hasSeekerPoint,
  hasTargetPoint,
  seekerPlaceName,
  targetPlaceName,
  distanceMeters,
  loading,
  gpsLoading,
  searchQuery,
  searchResults,
  searchLoading,
  searchRole,
  answer,
  seaLevelEdgeCase = null,
  error,
  onMeasureFromChange,
  onTargetModeChange,
  onSearchQueryChange,
  onSearchSubmit,
  onSearchResultSelect,
  onUseGps,
  onFindCoastline,
  onRetrySeaLevel,
  onFindLinearFeature,
  onFindNearest,
  onAnswerChange,
  onCommit,
  awaitHiderAnswer = false,
  costLabel = "D3P1",
  isSubmitting = false,
  wizardStepRef,
}: MeasuringPanelProps) {
  const steps = stepsForMode(MEASURING_STEPS, awaitHiderAnswer);
  const { stepId: step, stepIndex, goNext, goBack, stepper } = useToolWizard(
    steps,
    { wizardStepRef },
  );

  const locationCategory: MeasuringLocationCategory | undefined =
    subject === "location"
      ? (measureFrom as MeasuringLocationCategory)
      : undefined;
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const measureCatalog = catalogOptions ?? MEASURING_CATALOG;
  const hasAvailableMeasureOptions = MEASURING_GROUPS.some((group) =>
    measureCatalog.some(
      (option) =>
        option.groupId === group.id && !usedMeasuringFromKinds.has(option.id),
    ),
  );

  const needsAutoResolve = measuringUsesDebouncedSeekerResolve(
    subject,
    measureFrom,
  );
  const anchorLoadingMessage = anchorResolveLoadingMessage(
    subject,
    measureFrom,
    locationCategory,
  );
  const canAdvanceFromAnchor =
    hasSeekerPoint &&
    (!optionChosen || !needsAutoResolve || (hasTargetPoint && !loading));
  const canAdvanceFromTarget = hasTargetPoint;
  const canPreviewAnswer =
    hasAvailableMeasureOptions &&
    hasSeekerPoint &&
    hasTargetPoint &&
    distanceMeters !== null;

  const canGoNext =
    (step === "anchor" && canAdvanceFromAnchor) ||
    (step === "source" && optionChosen && hasAvailableMeasureOptions) ||
    (step === "target" && canAdvanceFromTarget);
  const canSwipeNext = toolWizardSwipeNext(canGoNext, stepIndex, steps.length);

  return (
    <ToolPanelShell toolId="measuring" stepper={stepper}>
      <WizardSwipeSurface
        stepId={step}
        stepIndex={stepIndex}
        canGoBack={stepIndex > 0}
        canGoNext={canSwipeNext}
        onBack={goBack}
        onNext={goNext}
        footer={
          <ToolWizardNav
            stepIndex={stepIndex}
            stepCount={steps.length}
            onBack={goBack}
            onNext={goNext}
            canGoNext={canGoNext}
          />
        }
      >
        {step === "source" ? (
          <MeasuringSourceStep
            measureFrom={measureFrom}
            optionChosen={optionChosen}
            usedMeasuringFromKinds={usedMeasuringFromKinds}
            catalogOptions={catalogOptions}
            subject={subject}
            locationCategory={locationCategory}
            onMeasureFromChange={onMeasureFromChange}
          />
        ) : null}

        {step === "anchor" ? (
          <MeasuringAnchorStep
            hasSeekerPoint={hasSeekerPoint}
            gpsLoading={gpsLoading}
            seekerPlaceName={seekerPlaceName}
            anchorLat={anchorLat}
            anchorLng={anchorLng}
            loading={loading}
            anchorLoadingMessage={anchorLoadingMessage}
            allowsSearch={allowsSearch}
            searchQuery={searchQuery}
            searchLoading={searchLoading}
            onUseGps={onUseGps}
            onSearchQueryChange={onSearchQueryChange}
            onSearchSubmit={() => onSearchSubmit("seeker")}
          />
        ) : null}

        {step === "target" ? (
          <ToolSection first compact status="active">
            <MeasuringTargetSection
              subject={subject}
              measureFrom={measureFrom}
              locationCategory={locationCategory}
              usesAllPlacesInArea={usesAllPlacesInArea}
              targetMode={targetMode}
              hasSeekerPoint={hasSeekerPoint}
              hasTargetPoint={hasTargetPoint}
              targetPlaceName={targetPlaceName}
              distanceMeters={distanceMeters}
              anchorAltitudeMeters={anchorAltitudeMeters}
              loading={loading}
              searchQuery={searchQuery}
              searchLoading={searchLoading}
              distanceUnit={distanceUnit}
              error={error}
              anchorLoadingMessage={anchorLoadingMessage}
              onTargetModeChange={onTargetModeChange}
              onSearchQueryChange={onSearchQueryChange}
              onSearchSubmit={() => onSearchSubmit("target")}
              onFindCoastline={onFindCoastline}
              onRetrySeaLevel={onRetrySeaLevel}
              onFindLinearFeature={onFindLinearFeature}
              onFindNearest={onFindNearest}
            />
          </ToolSection>
        ) : null}

        {canPreviewAnswer && (step === "target" || step === "answer") ? (
          <MeasuringAnswerSection
            step={step}
            isSeaLevel={isSeaLevel}
            isCoastline={isCoastline}
            hasTargetPoint={hasTargetPoint}
            distanceMeters={distanceMeters}
            targetPlaceName={targetPlaceName}
            targetLabel={targetLabel}
            distanceUnit={distanceUnit}
            awaitHiderAnswer={awaitHiderAnswer}
            costLabel={costLabel}
            isSubmitting={isSubmitting}
            hasAvailableMeasureOptions={hasAvailableMeasureOptions}
            hasSeekerPoint={hasSeekerPoint}
            answer={answer}
            seaLevelEdgeCase={seaLevelEdgeCase}
            onAnswerChange={onAnswerChange}
            onCommit={onCommit}
          />
        ) : null}

        {allowsSearch && searchResults.length > 0 && step !== "answer" && step !== "target" ? (
          <div className="jl-wizard-search-results">
            <SearchResultsList
              results={searchResults}
              onSelect={(place) => onSearchResultSelect(place, searchRole)}
            />
          </div>
        ) : null}
      </WizardSwipeSurface>

      {error ? <InlineError>{error}</InlineError> : null}
    </ToolPanelShell>
  );
}
