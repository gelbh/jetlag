import type { SeaLevelEdgeCase } from "../../../domain/geometry/seaLevel";
import {
  formatAltitudeLabel,
  formatDistance,
  type DistanceUnit,
} from "../../../domain/map/distance";
import {
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
} from "../../../domain/questions";
import { closerFurtherAnswerOptions } from "./binaryAnswerOptions";
import { BinaryAnswerPicker } from "./BinaryAnswerPicker";
import { LoadingReadout } from "./LoadingReadout";
import { ResolvedReadout } from "./ResolvedReadout";
import { SearchField } from "../../ui/SearchField";
import { SegmentedControl } from "./SegmentedControl";
import { SendToHidersButton } from "./SendToHidersButton";
import { ToolSection } from "./ToolSection";

interface MeasuringTargetSectionProps {
  subject: MeasuringSubject;
  measureFrom: MeasuringFromKind;
  locationCategory?: MeasuringLocationCategory;
  usesAllPlacesInArea: boolean;
  targetMode: MeasuringTargetMode;
  hasSeekerPoint: boolean;
  hasTargetPoint: boolean;
  targetPlaceName: string | null;
  distanceMeters: number | null;
  anchorAltitudeMeters: number | null;
  loading: boolean;
  searchQuery: string;
  searchLoading: boolean;
  distanceUnit: DistanceUnit;
  error?: string | null;
  anchorLoadingMessage: string | null;
  onTargetModeChange: (mode: MeasuringTargetMode) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onFindCoastline: () => void;
  onRetrySeaLevel: () => void;
  onFindLinearFeature: () => void;
  onFindNearest: () => void;
}

export function MeasuringTargetSection(props: MeasuringTargetSectionProps) {
  const {
    subject,
    measureFrom,
    locationCategory,
    usesAllPlacesInArea,
    targetMode,
    hasSeekerPoint,
    hasTargetPoint,
    targetPlaceName,
    distanceMeters,
    anchorAltitudeMeters,
    loading,
    searchQuery,
    searchLoading,
    distanceUnit,
    error,
    anchorLoadingMessage,
    onTargetModeChange,
    onSearchQueryChange,
    onSearchSubmit,
    onFindCoastline,
    onRetrySeaLevel,
    onFindLinearFeature,
    onFindNearest,
  } = props;

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

  const targetModeOptions = [
    ...(canUseMapTarget ? [{ value: "map" as const, label: "Map" }] : []),
    ...(allowsSearch ? [{ value: "search" as const, label: "Search" }] : []),
    ...(canFindNearest ? [{ value: "nearest" as const, label: "Nearest" }] : []),
  ];

  if (isCoastline) {
    return (
      <>
        {loading ? (
          <LoadingReadout>Finding coastline in the play area…</LoadingReadout>
        ) : null}
        {hasTargetPoint && distanceMeters !== null ? (
          <ResolvedReadout>
            Nearest coastline is {formatDistance(distanceMeters, distanceUnit)} away.
          </ResolvedReadout>
        ) : (
          <ResolvedReadout variant="dim">
            Set your anchor to find the nearest coastline.
          </ResolvedReadout>
        )}
        {error && hasSeekerPoint && !loading ? (
          <button type="button" onClick={onFindCoastline} className="btn-secondary w-full">
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
          <LoadingReadout>Reading elevation and shading the play area…</LoadingReadout>
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
        {error && hasSeekerPoint && !loading ? (
          <button type="button" onClick={onRetrySeaLevel} className="btn-secondary w-full">
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
            {anchorLoadingMessage ??
              `Loading ${targetLabel.toLowerCase()}s in the play area…`}
          </LoadingReadout>
        ) : (
          <ResolvedReadout variant="dim">
            All {targetLabel.toLowerCase()}s in the play area are used for this question.
            Set your anchor to load them.
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
          onSubmit={onSearchSubmit}
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
}

export type MeasuringAnswerSectionPart = "all" | "readout" | "actions";

interface MeasuringAnswerSectionProps {
  step: string;
  part?: MeasuringAnswerSectionPart;
  isSeaLevel: boolean;
  isCoastline: boolean;
  hasTargetPoint: boolean;
  distanceMeters: number | null;
  targetPlaceName: string | null;
  targetLabel: string;
  distanceUnit: DistanceUnit;
  awaitHiderAnswer: boolean;
  costLabel: string;
  isSubmitting: boolean;
  hasAvailableMeasureOptions: boolean;
  hasSeekerPoint: boolean;
  answer: MeasuringAnswer | null;
  seaLevelEdgeCase?: SeaLevelEdgeCase | null;
  onAnswerChange: (answer: MeasuringAnswer) => void;
  onCommit: () => void;
}

export function MeasuringAnswerSection({
  step,
  part = "all",
  isSeaLevel,
  isCoastline,
  hasTargetPoint,
  distanceMeters,
  targetPlaceName,
  targetLabel,
  distanceUnit,
  awaitHiderAnswer,
  costLabel,
  isSubmitting,
  hasAvailableMeasureOptions,
  hasSeekerPoint,
  answer,
  seaLevelEdgeCase = null,
  onAnswerChange,
  onCommit,
}: MeasuringAnswerSectionProps) {
  const disabledSeaLevelAnswers =
    seaLevelEdgeCase === "highest"
      ? new Set<MeasuringAnswer>(["further"])
      : undefined;

  const readout =
    hasTargetPoint && distanceMeters !== null && !isSeaLevel && !isCoastline ? (
      <ResolvedReadout>
        {targetPlaceName ?? targetLabel} is{" "}
        {formatDistance(distanceMeters, distanceUnit)} from you.
      </ResolvedReadout>
    ) : null;

  const actions =
    awaitHiderAnswer ? (
      step === "target" ? (
        <SendToHidersButton
          costLabel={costLabel}
          isSubmitting={isSubmitting}
          disabled={
            !hasAvailableMeasureOptions || !hasSeekerPoint || !hasTargetPoint
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
            The map shows the shaded area for your choice. Tap Next when ready to add
            the question.
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
    );

  if (part === "readout") {
    return readout ? (
      <ToolSection
        compact
        first={step === "answer"}
        status={answer !== null ? "complete" : "active"}
      >
        {readout}
      </ToolSection>
    ) : null;
  }

  if (part === "actions") {
    return actions ? (
      <ToolSection
        compact
        first={step === "answer"}
        status={answer !== null ? "complete" : "active"}
      >
        {actions}
      </ToolSection>
    ) : null;
  }

  return (
    <ToolSection
      compact
      first={step === "answer"}
      status={answer !== null ? "complete" : "active"}
    >
      {readout}
      {actions}
    </ToolSection>
  );
}
