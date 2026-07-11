import { type RefObject } from "react";
import {
  MEASURING_CATALOG,
  MEASURING_GROUPS,
  measuringQuestionFor,
  measuringSupportsMapTarget,
  measuringSupportsNearest,
  measuringSupportsSearch,
  measuringTargetKind,
  measuringTargetLabel,
  measuringUsesAllPlacesInArea,
  type MeasuringAnswer,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/questions";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import {
  formatAltitudeLabel,
  formatDistance,
  type DistanceUnit,
} from "../../domain/map/distance";
import type { SeaLevelEdgeCase } from "../../domain/geometry/seaLevel";
import { closerFurtherAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { CatalogExhaustedMessage } from "./shared/CatalogExhaustedMessage";
import { CoordinateCopyButton } from "./shared/CoordinateCopyButton";
import { AnchorControls } from "./shared/AnchorControls";
import { LoadingReadout } from "./shared/LoadingReadout";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { SearchResultsList } from "./shared/SearchResultsList";
import { SegmentedControl } from "./shared/SegmentedControl";
import { SearchField } from "../ui/SearchField";
import { InlineError } from "../ui/InlineError";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { SendToHidersButton } from "./shared/SendToHidersButton";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { MEASURING_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { useToolWizard } from "../../hooks/useToolWizard";

type MeasuringSearchRole = "seeker" | "target";

function measuringUsesDebouncedSeekerResolve(
  subject: MeasuringSubject,
  measureFrom: MeasuringFromKind,
): boolean {
  return (
    subject === "coastline" ||
    subject === "sea_level" ||
    measuringUsesAllPlacesInArea(measureFrom)
  );
}

function anchorResolveLoadingMessage(
  subject: MeasuringSubject,
  measureFrom: MeasuringFromKind,
  locationCategory?: MeasuringLocationCategory,
): string | null {
  if (!measuringUsesDebouncedSeekerResolve(subject, measureFrom)) {
    return null;
  }

  if (subject === "coastline") {
    return "Finding coastline in the play area…";
  }

  if (subject === "sea_level") {
    return "Reading elevation and shading the play area…";
  }

  const targetLabel = measuringTargetLabel(subject, locationCategory);
  return `Loading ${targetLabel.toLowerCase()}s in the play area…`;
}

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
  seaLevelNote = null,
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

  const locationCategory =
    subject === "location"
      ? (measureFrom as MeasuringLocationCategory)
      : undefined;
  const question =
    optionChosen && locationCategory
      ? measuringQuestionFor(subject, locationCategory)
      : null;
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const isLinear = targetKind === "linear" || targetKind === "polygon";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const canFindNearest = measuringSupportsNearest(measureFrom);
  const canUseMapTarget = measuringSupportsMapTarget(measureFrom);
  const targetSummary = isSeaLevel
    ? hasTargetPoint && anchorAltitudeMeters !== null
      ? `Elevation loaded · ${formatAltitudeLabel(anchorAltitudeMeters, distanceUnit)}`
      : "Set your anchor to read elevation"
    : (targetPlaceName ??
      (hasTargetPoint ? `${targetLabel} pinned` : "No target yet"));
  const measureCatalog = catalogOptions ?? MEASURING_CATALOG;
  const availableGroups = MEASURING_GROUPS.map((group) => ({
    ...group,
    options: measureCatalog.filter(
      (option) =>
        option.groupId === group.id && !usedMeasuringFromKinds.has(option.id),
    ),
  })).filter((group) => group.options.length > 0);
  const hasAvailableMeasureOptions = availableGroups.length > 0;

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

  const disabledSeaLevelAnswers =
    seaLevelEdgeCase === "highest"
      ? new Set<MeasuringAnswer>(["further"])
      : undefined;

  const targetModeOptions = [
    ...(canUseMapTarget
      ? [{ value: "map" as const, label: "Map" }]
      : []),
    ...(allowsSearch
      ? [{ value: "search" as const, label: "Search" }]
      : []),
    ...(canFindNearest
      ? [{ value: "nearest" as const, label: "Nearest" }]
      : []),
  ];

  const renderTargetSection = () => {
    if (isCoastline) {
      return (
        <>
          {loading ? (
            <LoadingReadout>Finding coastline in the play area…</LoadingReadout>
          ) : null}
          {hasTargetPoint && distanceMeters !== null ? (
            <ResolvedReadout>
              Nearest coastline is {formatDistance(distanceMeters, distanceUnit)}{" "}
              away.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="dim">
              Set your anchor to find the nearest coastline.
            </ResolvedReadout>
          )}
          {error && hasSeekerPoint && !loading ? (
            <button
              type="button"
              onClick={onFindCoastline}
              className="btn-secondary w-full"
            >
              Retry
            </button>
          ) : null}
        </>
      );
    }

    if (isSeaLevel) {
      return (
        <>
          {loading ? (
            <LoadingReadout>
              Reading elevation and shading the play area…
            </LoadingReadout>
          ) : null}
          {hasTargetPoint && anchorAltitudeMeters !== null ? (
            <ResolvedReadout>
              You are {formatAltitudeLabel(anchorAltitudeMeters, distanceUnit)}.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="dim">
              Set your anchor to read elevation from sea level.
            </ResolvedReadout>
          )}
          {seaLevelNote ? (
            <ResolvedReadout variant="dim">{seaLevelNote}</ResolvedReadout>
          ) : null}
          {error && hasSeekerPoint && !loading ? (
            <button
              type="button"
              onClick={onRetrySeaLevel}
              className="btn-secondary w-full"
            >
              Retry
            </button>
          ) : null}
        </>
      );
    }

    if (isLinear) {
      return (
        <button
          type="button"
          onClick={onFindLinearFeature}
          disabled={!hasSeekerPoint || loading}
          className="btn-secondary w-full disabled:opacity-40"
        >
          {loading
            ? `Finding ${targetLabel.toLowerCase()}…`
            : `Find ${targetLabel.toLowerCase()} in play area`}
        </button>
      );
    }

    if (usesAllPlacesInArea) {
      return (
        <>
          {loading ? (
            <LoadingReadout>
              {anchorLoadingMessage ?? `Loading ${targetLabel.toLowerCase()}s in the play area…`}
            </LoadingReadout>
          ) : (
            <ResolvedReadout variant="dim">
              All {targetLabel.toLowerCase()}s in the play area are used for this
              question. Set your anchor to load them.
            </ResolvedReadout>
          )}
          {hasTargetPoint && distanceMeters !== null ? (
            <ResolvedReadout>
              Nearest is {formatDistance(distanceMeters, distanceUnit)} away
              {targetPlaceName ? ` (${targetPlaceName})` : ""}.
            </ResolvedReadout>
          ) : null}
        </>
      );
    }

    return (
      <>
        {targetModeOptions.length > 0 ? (
          <SegmentedControl
            value={targetMode}
            options={targetModeOptions}
            onChange={onTargetModeChange}
            aria-label="Target input mode"
          />
        ) : null}
        {targetMode === "map" && canUseMapTarget ? (
          <ResolvedReadout variant="dim">
            {hasSeekerPoint
              ? `Tap the map to mark the ${targetLabel.toLowerCase()}.`
              : "Set your anchor first, then tap the map for the target."}
          </ResolvedReadout>
        ) : null}
        {allowsSearch && targetMode === "search" ? (
          <SearchField
            label="Search target"
            value={searchQuery}
            onChange={onSearchQueryChange}
            onSubmit={() => onSearchSubmit("target")}
            submitLabel="Find target"
            loading={searchLoading}
            placeholder="Address, business, or landmark"
            disabled={!hasSeekerPoint}
            submitClassName="btn-secondary w-full disabled:opacity-40"
          />
        ) : null}
        {targetMode === "nearest" && canFindNearest ? (
          <button
            type="button"
            onClick={onFindNearest}
            disabled={!hasSeekerPoint || loading}
            className="btn-secondary w-full disabled:opacity-40"
          >
            {loading
              ? `Finding nearest ${targetLabel.toLowerCase()}…`
              : `Find nearest ${targetLabel.toLowerCase()}`}
          </button>
        ) : null}
        <ResolvedReadout variant={hasTargetPoint ? "default" : "dim"}>
          {targetSummary}
        </ResolvedReadout>
      </>
    );
  };

  const canGoNext =
    (step === "anchor" && canAdvanceFromAnchor) ||
    (step === "source" && optionChosen && hasAvailableMeasureOptions) ||
    (step === "target" && canAdvanceFromTarget);
  const canSwipeNext = canGoNext && stepIndex < steps.length - 1;

  return (
    <ToolPanelShell toolId="measuring" stepper={stepper}>
      <WizardSwipeSurface
        stepId={step}
        stepIndex={stepIndex}
        canGoBack={stepIndex > 0}
        canGoNext={canSwipeNext}
        onBack={goBack}
        onNext={goNext}
      >
      {step === "source" ? (
        <ToolSection first compact status="active">
          <label className="field-label">
            Measuring from
            <select
              value={optionChosen ? measureFrom : ""}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }

                onMeasureFromChange(event.target.value as MeasuringFromKind);
              }}
              disabled={!hasAvailableMeasureOptions}
              className="field-input disabled:opacity-40"
            >
              <option value="" disabled>
                Choose what to measure
              </option>
              {availableGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {!hasAvailableMeasureOptions ? (
            <CatalogExhaustedMessage message="Every measure category has already been added to this session." />
          ) : null}
          {question ? (
            <QuestionPromptBlock
              prompt={question.prompt}
              ruleSummary={question.ruleSummary}
            />
          ) : null}
        </ToolSection>
      ) : null}

      {step === "anchor" ? (
        <ToolSection first compact status="active">
          <AnchorControls
            gpsLoading={gpsLoading}
            hasAnchor={hasSeekerPoint}
            onUseGps={onUseGps}
            anchorPlaceName={hasSeekerPoint ? seekerPlaceName : null}
          />
          {hasSeekerPoint &&
          typeof anchorLat === "number" &&
          typeof anchorLng === "number" ? (
            <CoordinateCopyButton lat={anchorLat} lng={anchorLng} className="w-full" />
          ) : null}
          {loading && hasSeekerPoint && anchorLoadingMessage ? (
            <LoadingReadout>{anchorLoadingMessage}</LoadingReadout>
          ) : null}
          {allowsSearch ? (
            <SearchField
              label="Search anchor"
              value={searchQuery}
              onChange={onSearchQueryChange}
              onSubmit={() => onSearchSubmit("seeker")}
              submitLabel="Find anchor"
              loading={searchLoading}
              placeholder="Address, business, or landmark"
              submitClassName="btn-secondary w-full disabled:opacity-40"
            />
          ) : null}
        </ToolSection>
      ) : null}

      {step === "target" ? (
        <ToolSection first compact status="active">
          {renderTargetSection()}
        </ToolSection>
      ) : null}

      {canPreviewAnswer && (step === "target" || step === "answer") ? (
        <ToolSection
          compact
          first={step === "answer"}
          status={answer !== null ? "complete" : "active"}
        >
          {hasTargetPoint && distanceMeters !== null && !isSeaLevel && !isCoastline ? (
            <ResolvedReadout>
              {targetPlaceName ?? targetLabel} is{" "}
              {formatDistance(distanceMeters, distanceUnit)} from you.
            </ResolvedReadout>
          ) : null}
          {awaitHiderAnswer ? (
            step === "target" ? (
              <SendToHidersButton
                costLabel={costLabel}
                isSubmitting={isSubmitting}
                disabled={
                  !hasAvailableMeasureOptions ||
                  !hasSeekerPoint ||
                  !hasTargetPoint
                }
                onClick={onCommit}
                instruction="Hiders answer closer or further in game chat once you send this question."
              />
            ) : null
          ) : (
            <>
              <BinaryAnswerPicker
                value={answer}
                onChange={onAnswerChange}
                options={closerFurtherAnswerOptions}
                label=""
                disabledValues={disabledSeaLevelAnswers}
              />
              {step === "target" ? (
                <p className="text-xs text-ink-dim">
                  The map shows the shaded area for your choice. Tap Next when
                  ready to add the question.
                </p>
              ) : null}
              {step === "answer" ? (
                <button
                  type="button"
                  onClick={onCommit}
                  disabled={
                    !hasAvailableMeasureOptions ||
                    !hasSeekerPoint ||
                    !hasTargetPoint ||
                    answer === null
                  }
                  className="btn-primary w-full disabled:opacity-40"
                >
                  Add measure question
                </button>
              ) : null}
            </>
          )}
        </ToolSection>
      ) : null}

      {allowsSearch && searchResults.length > 0 && step !== "answer" && step !== "target" ? (
        <SearchResultsList
          results={searchResults}
          onSelect={(place) => onSearchResultSelect(place, searchRole)}
        />
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={canGoNext}
      />
      </WizardSwipeSurface>

      {error ? <InlineError>{error}</InlineError> : null}
    </ToolPanelShell>
  );
}
