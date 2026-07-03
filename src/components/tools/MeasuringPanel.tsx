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
import { ToolPanelShell } from "./shared/ToolPanelShell";

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

const STEPS = [
  { id: "source", label: "Question" },
  { id: "anchor", label: "Anchor" },
  { id: "target", label: "Target" },
  { id: "answer", label: "Answer" },
] as const;

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
  const step = STEPS[stepIndex]?.id ?? "source";

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

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const renderTargetSection = () => {
    if (isCoastline) {
      return (
        <>
          <button
            type="button"
            onClick={onFindCoastline}
            disabled={!hasSeekerPoint || loading}
            className="btn-secondary w-full disabled:opacity-40"
          >
            {loading ? "Finding coastline…" : "Find coastline in play area"}
          </button>
          {loading ? (
            <p className="text-sm text-ink-dim">
              Finding coastline in the play area…
            </p>
          ) : null}
        </>
      );
    }

    if (isSeaLevel) {
      return (
        <>
          {loading ? (
            <p className="text-sm text-ink-dim">
              Reading elevation and shading the play area…
            </p>
          ) : null}
          {hasTargetPoint && anchorAltitudeMeters !== null ? (
            <p className="text-sm text-ink-muted">
              Your altitude is {Math.round(anchorAltitudeMeters)} m (
              {formatDistance(distanceMeters ?? 0, distanceUnit)} from sea level).
            </p>
          ) : (
            <p className="text-sm text-ink-dim">
              Set your anchor to read elevation from sea level.
            </p>
          )}
        </>
      );
    }

    if (isLinear) {
      return (
        <>
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
        </>
      );
    }

    if (usesAllPlacesInArea) {
      return (
        <>
          <p className="text-sm text-ink-dim">
            All {targetLabel.toLowerCase()}s in the play area are used for this
            question. Set your anchor to load them.
          </p>
          {hasTargetPoint && distanceMeters !== null ? (
            <p className="text-sm text-ink-muted">
              Nearest is {formatDistance(distanceMeters, distanceUnit)} away
              {targetPlaceName ? ` (${targetPlaceName})` : ""}.
            </p>
          ) : null}
        </>
      );
    }

    return (
      <>
        <div
          className={`grid gap-2 ${allowsSearch ? "grid-cols-3" : "grid-cols-2"}`}
        >
          {canUseMapTarget ? (
            <button
              type="button"
              onClick={() => onTargetModeChange("map")}
              className={`min-h-12 rounded-[var(--radius-hud-md)] px-2 text-sm ${
                targetMode === "map"
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink-secondary"
              }`}
            >
              Map
            </button>
          ) : null}
          {allowsSearch ? (
            <button
              type="button"
              onClick={() => onTargetModeChange("search")}
              className={`min-h-12 rounded-[var(--radius-hud-md)] px-2 text-sm ${
                targetMode === "search"
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink-secondary"
              }`}
            >
              Search
            </button>
          ) : null}
          {canFindNearest ? (
            <button
              type="button"
              onClick={() => onTargetModeChange("nearest")}
              className={`min-h-12 rounded-[var(--radius-hud-md)] px-2 text-sm ${
                targetMode === "nearest"
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink-secondary"
              }`}
            >
              Nearest
            </button>
          ) : null}
        </div>
        {targetMode === "map" && canUseMapTarget ? (
          <p className="text-sm text-ink-dim">
            {hasSeekerPoint
              ? `Tap the map to mark the ${targetLabel.toLowerCase()}.`
              : "Set your anchor first, then tap the map for the target."}
          </p>
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
        <p className="text-sm text-ink-muted">{targetSummary}</p>
      </>
    );
  };

  return (
    <ToolPanelShell
      toolId="measuring"
      helper="Work through each step: question, anchor, target, then your answer."
    >
      <p className="text-xs font-medium text-ink-dim">
        Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex]?.label}
      </p>

      {step === "source" ? (
        <div className="space-y-3">
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
          <p className="text-sm font-medium text-ink">{question.prompt}</p>
          <p className="text-sm text-ink-dim">{question.ruleSummary}</p>
        </div>
      ) : null}

      {step === "anchor" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onUseGps}
              disabled={gpsLoading}
              className="btn-secondary disabled:opacity-40"
            >
              {gpsLoading ? "Reading GPS…" : "Use my location"}
            </button>
            <div className="flex min-h-12 items-center rounded-[var(--radius-hud-md)] border border-border bg-surface-base px-3 text-sm text-ink-muted">
              {hasSeekerPoint
                ? (seekerPlaceName ?? "Pinned on map")
                : "Tap map for anchor"}
            </div>
          </div>
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
        </div>
      ) : null}

      {step === "target" ? (
        <div className="space-y-3">{renderTargetSection()}</div>
      ) : null}

      {step === "answer" ? (
        <div className="space-y-3">
          {hasTargetPoint && distanceMeters !== null && !isSeaLevel ? (
            <p className="text-sm text-ink-muted">
              {targetPlaceName ?? targetLabel} is{" "}
              {formatDistance(distanceMeters, distanceUnit)} from you.
            </p>
          ) : null}
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={closerFurtherAnswerOptions}
          />
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
        </div>
      ) : null}

      {allowsSearch && searchResults.length > 0 && step !== "answer" ? (
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-[var(--radius-hud-md)] border border-border bg-surface-base p-2">
          {searchResults.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => onSearchResultSelect(place, searchRole)}
              className="min-h-12 w-full rounded-[var(--radius-hud-sm)] bg-surface-raised px-3 py-2 text-left text-sm text-ink"
            >
              {place.displayName}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        {stepIndex > 0 ? (
          <button type="button" onClick={goBack} className="btn-secondary flex-1">
            Back
          </button>
        ) : null}
        {step !== "answer" ? (
          <button
            type="button"
            onClick={goNext}
            disabled={
              (step === "source" && !hasAvailableMeasureOptions) ||
              (step === "anchor" && !canAdvanceFromAnchor) ||
              (step === "target" && !canAdvanceFromTarget)
            }
            className="btn-primary flex-1 disabled:opacity-40"
          >
            Next
          </button>
        ) : null}
      </div>

      {error ? <p className="text-error">{error}</p> : null}
    </ToolPanelShell>
  );
}
