/**
 * Measuring Ask HUD mode body — anchor / catalog rail / target / answer.
 * SingleBottomChord: one interactive surface at a time. No PhaseRail / CONTINUE.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { MeasuringAnchorStep } from "@/components/tools/shared/measuring/MeasuringAnchorStep";
import {
  MeasuringAnswerSection,
  MeasuringTargetSection,
} from "@/components/tools/shared/measuring/MeasuringTargetStep";
import {
  anchorResolveLoadingMessage,
  type MeasuringSearchRole,
} from "@/components/tools/shared/measuring/measuringPanelUtils";
import { SearchResultsList } from "@/components/tools/shared/controls/SearchResultsList";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
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
} from "@/domain/questions";
import type { DistanceUnit } from "@/domain/map/distance";
import type { SeaLevelEdgeCase } from "@/domain/geometry/measuring/seaLevel";
import type { GeocodedPlace } from "@/services/geo/geocoding";

export type MeasuringHudBodyProps = {
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
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
};

export function MeasuringHudBody({
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
  error = null,
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
  awaitHiderAnswer = false,
  costLabel = "D3P1",
  isSubmitting = false,
}: MeasuringHudBodyProps) {
  const locationCategory: MeasuringLocationCategory | undefined =
    subject === "location" ? (measureFrom as MeasuringLocationCategory) : undefined;
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

  const anchorLoadingMessage = anchorResolveLoadingMessage(
    subject,
    measureFrom,
    locationCategory,
  );

  const catalogRows = MEASURING_GROUPS.flatMap((group) =>
    measureCatalog
      .filter(
        (option) =>
          option.groupId === group.id && !usedMeasuringFromKinds.has(option.id),
      )
      .map((option) => ({
        id: option.id,
        label: `${group.label}: ${option.label}`,
      })),
  );

  const showAnswer =
    hasAvailableMeasureOptions &&
    hasSeekerPoint &&
    hasTargetPoint &&
    distanceMeters !== null &&
    optionChosen;

  const chord: "anchor" | "source" | "target" | "answer" = !hasSeekerPoint
    ? "anchor"
    : !optionChosen
      ? "source"
      : showAnswer
        ? "answer"
        : "target";

  return (
    <div
      data-testid="measuring-hud-body"
      className="ask-hud-mode-body mx-auto flex max-w-xl flex-col gap-2"
    >
      {chord === "anchor" ? (
        <div className="pointer-events-auto hud-panel p-3">
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
        </div>
      ) : null}

      {chord === "source" ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          {!hasAvailableMeasureOptions ? (
            <p className="pointer-events-auto hud-panel p-3 text-sm text-ink-muted">
              Every measure category has already been added to this session.
            </p>
          ) : (
            <AskCatalogRail
              rows={catalogRows}
              selectedId={optionChosen ? measureFrom : null}
              onSelect={(id) => onMeasureFromChange(id as MeasuringFromKind)}
              aria-label="Measuring from"
              hint="Tap a row to set what you measure"
            />
          )}
        </div>
      ) : null}

      {chord === "target" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
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
        </div>
      ) : null}

      {chord === "answer" ? (
        <div className="pointer-events-auto hud-panel p-3">
          <MeasuringAnswerSection
            step="ask"
            part="all"
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
            onCommit={() => {
              /* Commit lives on AskCommitStrip. */
            }}
          />
        </div>
      ) : null}

      {allowsSearch && searchResults.length > 0 && chord !== "answer" ? (
        <div className="pointer-events-auto hud-panel jl-scroll max-h-40 p-2">
          <SearchResultsList
            results={searchResults}
            onSelect={(place) => onSearchResultSelect(place, searchRole)}
          />
        </div>
      ) : null}
    </div>
  );
}
