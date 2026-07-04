import { useState } from "react";
import {
  MEASURING_GROUPS,
  measuringCatalogOptionsForGroup,
  measuringQuestionFor,
  measuringSupportsMapTarget,
  measuringSupportsNearest,
  measuringSupportsSearch,
  measuringTargetKind,
  measuringTargetLabel,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/measuringQuestions";
import type { GeocodedPlace } from "../../services/geocoding";
import { formatDistance, type DistanceUnit } from "../../domain/distance";
import { closerFurtherAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { AnchorControls } from "./shared/AnchorControls";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { SearchResultsList } from "./shared/SearchResultsList";
import { SegmentedControl } from "./shared/SegmentedControl";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  MEASURING_STEPS,
} from "./shared/toolStepUtils";

type MeasuringSearchRole = "seeker" | "target";

interface MeasuringPanelProps {
  distanceUnit: DistanceUnit;
  measureFrom: MeasuringFromKind;
  usesAllPlacesInArea: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
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
  onFindLinearFeature: () => void;
  onFindNearest: () => void;
  onAnswerChange: (answer: MeasuringAnswer) => void;
  onCommit: () => void;
}

export function MeasuringPanel({
  distanceUnit,
  measureFrom,
  usesAllPlacesInArea,
  usedMeasuringFromKinds,
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
  error,
  onMeasureFromChange,
  onTargetModeChange,
  onSearchQueryChange,
  onSearchSubmit,
  onSearchResultSelect,
  onUseGps,
  onFindCoastline,
  onFindLinearFeature,
  onFindNearest,
  onAnswerChange,
  onCommit,
}: MeasuringPanelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = MEASURING_STEPS[stepIndex]?.id ?? "source";

  const locationCategory =
    subject === "location"
      ? (measureFrom as MeasuringLocationCategory)
      : undefined;
  const question = measuringQuestionFor(subject, locationCategory);
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const isLinear = targetKind === "linear";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const canFindNearest = measuringSupportsNearest(measureFrom);
  const canUseMapTarget = measuringSupportsMapTarget(measureFrom);
  const targetSummary = isSeaLevel
    ? hasTargetPoint
      ? "Sea level reference loaded"
      : "Set your anchor to read elevation"
    : (targetPlaceName ??
      (hasTargetPoint ? `${targetLabel} pinned` : "No target yet"));
  const availableGroups = MEASURING_GROUPS.map((group) => ({
    ...group,
    options: measuringCatalogOptionsForGroup(group.id).filter(
      (option) => !usedMeasuringFromKinds.has(option.id),
    ),
  })).filter((group) => group.options.length > 0);
  const hasAvailableMeasureOptions = availableGroups.length > 0;

  const canAdvanceFromAnchor = hasSeekerPoint;
  const canAdvanceFromTarget = hasTargetPoint;
  const canPreviewAnswer =
    hasAvailableMeasureOptions &&
    hasSeekerPoint &&
    hasTargetPoint &&
    distanceMeters !== null;

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, MEASURING_STEPS.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const stepper = (
    <ToolStepper
      steps={buildSteps(
        MEASURING_STEPS,
        deriveStepStates(MEASURING_STEPS.length, stepIndex),
      )}
    />
  );

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
            <ResolvedReadout variant="dim">
              Finding coastline in the play area…
            </ResolvedReadout>
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
            <ResolvedReadout variant="dim">
              Reading elevation and shading the play area…
            </ResolvedReadout>
          ) : null}
          {hasTargetPoint && anchorAltitudeMeters !== null ? (
            <ResolvedReadout>
              Your altitude is {Math.round(anchorAltitudeMeters)} m (
              {formatDistance(distanceMeters ?? 0, distanceUnit)} from sea level).
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="dim">
              Set your anchor to read elevation from sea level.
            </ResolvedReadout>
          )}
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
          <ResolvedReadout variant="dim">
            All {targetLabel.toLowerCase()}s in the play area are used for this
            question. Set your anchor to load them.
          </ResolvedReadout>
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
          <>
            <label className="field-label">
              Search target
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearchSubmit("target");
                  }
                }}
                className="field-input"
                placeholder="Address, business, or landmark"
                autoComplete="off"
                enterKeyHint="search"
                inputMode="search"
              />
            </label>
            <button
              type="button"
              onClick={() => onSearchSubmit("target")}
              disabled={searchLoading || !hasSeekerPoint}
              className="btn-secondary w-full disabled:opacity-40"
            >
              {searchLoading ? "Searching…" : "Find target"}
            </button>
          </>
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

  return (
    <ToolPanelShell toolId="measuring" stepper={stepper}>
      {step === "source" ? (
        <ToolSection first compact status="active">
          <label className="field-label">
            Measuring from
            <select
              value={measureFrom}
              onChange={(event) =>
                onMeasureFromChange(event.target.value as MeasuringFromKind)
              }
              disabled={!hasAvailableMeasureOptions}
              className="field-input disabled:opacity-40"
            >
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
            <p className="text-sm text-ink-dim">
              Every measure category has already been added to this session.
            </p>
          ) : null}
          <QuestionPromptBlock
            prompt={question.prompt}
            ruleSummary={question.ruleSummary}
          />
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
          {allowsSearch ? (
            <>
              <label className="field-label">
                Search anchor
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearchSubmit("seeker");
                    }
                  }}
                  className="field-input"
                  placeholder="Address, business, or landmark"
                  autoComplete="off"
                  enterKeyHint="search"
                  inputMode="search"
                />
              </label>
              <button
                type="button"
                onClick={() => onSearchSubmit("seeker")}
                disabled={searchLoading}
                className="btn-secondary w-full disabled:opacity-40"
              >
                {searchLoading ? "Searching…" : "Find anchor"}
              </button>
            </>
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
          {hasTargetPoint && distanceMeters !== null && !isSeaLevel ? (
            <ResolvedReadout>
              {targetPlaceName ?? targetLabel} is{" "}
              {formatDistance(distanceMeters, distanceUnit)} from you.
            </ResolvedReadout>
          ) : null}
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={closerFurtherAnswerOptions}
            label=""
          />
          {step === "target" ? (
            <p className="text-xs text-ink-dim">
              The map shows the shaded area for your choice. Tap Next when ready
              to add the question.
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
        stepCount={MEASURING_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "source" && hasAvailableMeasureOptions) ||
          (step === "anchor" && canAdvanceFromAnchor) ||
          (step === "target" && canAdvanceFromTarget)
        }
      />

      {error ? <p className="text-error">{error}</p> : null}
    </ToolPanelShell>
  );
}
