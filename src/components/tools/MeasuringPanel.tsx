import { type RefObject } from "react";
import {
  BASE_MEASURING_CATALOG,
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
import type { SeaLevelEdgeCase } from "../../domain/geometry/measuring/seaLevel";
import { type DistanceUnit } from "../../domain/map/distance";
import { MeasuringAnchorStep } from "./shared/measuring/MeasuringAnchorStep";
import {
  MeasuringAnswerSection,
  MeasuringTargetSection,
} from "./shared/measuring/MeasuringTargetStep";
import { MeasuringSourceStep } from "./shared/measuring/MeasuringSourceStep";
import {
  anchorResolveLoadingMessage,
  measuringUsesDebouncedSeekerResolve,
  type MeasuringSearchRole,
} from "./shared/measuring/measuringPanelUtils";
import { SearchResultsList } from "./shared/controls/SearchResultsList";
import { ToolPanelShell } from "./shared/panels/ToolPanelShell";
import { ToolSection } from "./shared/panels/ToolSection";
import { WizardPanelFrame } from "./shared/wizard/WizardPanelFrame";
import { WizardSwipeSurface } from "./shared/wizard/WizardSwipeSurface";
import { MEASURING_WIZARD } from "./shared/wizard/toolStepUtils";
import {
  toolWizardPhasePrimaryNav,
  toolWizardSwipeNext,
} from "./shared/wizard/toolWizardGuards";
import { useToolWizard } from "../../hooks/wizard/useToolWizard";
import { QuestionTruthReferenceHint } from "./shared/QuestionTruthReferenceHint";

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
  const {
    phaseId,
    stepId,
    phaseIndex,
    phaseCount,
    configureIndex,
    goNext,
    goBack,
    Stepper,
  } = useToolWizard(MEASURING_WIZARD, {
    wizardStepRef,
    awaitHiderAnswer,
    toolCommitLabel: awaitHiderAnswer
      ? `Send to hiders (${costLabel})`
      : "Add measure question",
    isSubmitting,
  });

  const locationCategory: MeasuringLocationCategory | undefined =
    subject === "location"
      ? (measureFrom as MeasuringLocationCategory)
      : undefined;
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const measureCatalog = catalogOptions ?? BASE_MEASURING_CATALOG;
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
    (phaseId === "place" && canAdvanceFromAnchor) ||
    (phaseId === "configure" &&
      stepId === "source" &&
      optionChosen &&
      hasAvailableMeasureOptions) ||
    (phaseId === "configure" &&
      stepId === "target" &&
      canAdvanceFromTarget);
  const canCommit =
    hasAvailableMeasureOptions &&
    hasSeekerPoint &&
    hasTargetPoint &&
    (awaitHiderAnswer || answer !== null) &&
    !isSubmitting;
  const canSwipeNext = toolWizardSwipeNext(canGoNext, phaseIndex, phaseCount);
  const showMeasuringAnswer =
    canPreviewAnswer &&
    (stepId === "target" || phaseId === "ask");

  const panelBody = (
    <>
        {phaseId === "configure" && stepId === "source" ? (
          <>
            {awaitHiderAnswer ? (
              <QuestionTruthReferenceHint />
            ) : null}
            <MeasuringSourceStep
              measureFrom={measureFrom}
              optionChosen={optionChosen}
              usedMeasuringFromKinds={usedMeasuringFromKinds}
              catalogOptions={catalogOptions}
              subject={subject}
              locationCategory={locationCategory}
              onMeasureFromChange={onMeasureFromChange}
            />
          </>
        ) : null}

        {phaseId === "place" ? (
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

        {phaseId === "configure" && stepId === "target" ? (
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

        {showMeasuringAnswer ? (
          <MeasuringAnswerSection
            step={stepId}
            part="readout"
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

        {allowsSearch && searchResults.length > 0 && phaseId !== "ask" ? (
          <div className="jl-scroll jl-wizard-search-results">
            <SearchResultsList
              results={searchResults}
              onSelect={(place) => onSearchResultSelect(place, searchRole)}
            />
          </div>
        ) : null}
    </>
  );

  const answerFooter = showMeasuringAnswer ? (
      <MeasuringAnswerSection
        step={stepId}
        part="actions"
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
    ) : undefined;

  return (
    <ToolPanelShell
      toolId="measuring"
      fillHeight
      stepper={
        <Stepper
          nav={{
            canGoBack:
              phaseIndex > 0 ||
              (phaseId === "configure" && configureIndex > 0),
            onBack: goBack,
            ...toolWizardPhasePrimaryNav({
              phaseId,
              goNext,
              onCommit,
              canGoNext,
              canCommit,
            }),
          }}
        />
      }
    >
      <WizardPanelFrame scrollable stickyFooter={answerFooter} error={error}>
        <WizardSwipeSurface
          stepId={stepId}
          stepIndex={phaseIndex}
          canGoBack={phaseIndex > 0}
          canGoNext={canSwipeNext}
          onBack={goBack}
          onNext={goNext}
        >
          {panelBody}
        </WizardSwipeSurface>
      </WizardPanelFrame>
    </ToolPanelShell>
  );
}
