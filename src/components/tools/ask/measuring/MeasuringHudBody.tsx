import { UnstyledButton } from "@mantine/core";
import {
  BuildingsIcon,
  DropIcon,
  type IconProps,
  MapPinAreaIcon,
  SquaresFourIcon,
  TrainIcon,
  TreeIcon,
} from "@phosphor-icons/react";
import { type ComponentType, useState } from "react";
import { HudMeasuringIcon } from "@/components/map/icons/ToolIcons";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskHudPanel } from "@/components/tools/ask/AskHudPanel";
import { AskToolQuestionHeader } from "@/components/tools/ask/AskToolQuestionHeader";
import { SearchResultsList } from "@/components/tools/shared/controls/SearchResultsList";
import { MeasuringAnchorStep } from "@/components/tools/shared/measuring/MeasuringAnchorStep";
import {
  MeasuringAnswerSection,
  MeasuringTargetSection,
} from "@/components/tools/shared/measuring/MeasuringTargetStep";
import {
  anchorResolveLoadingMessage,
  type MeasuringSearchRole,
} from "@/components/tools/shared/measuring/measuringPanelUtils";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { filterChipStyles, filterChipTrackStyle } from "@/components/ui/entry/entryChrome";
import type { SeaLevelEdgeCase } from "@/domain/geometry/measuring/seaLevel";
import type { DistanceUnit } from "@/domain/map/distance";
import {
  BASE_MEASURING_CATALOG,
  MEASURING_GROUPS,
  type MeasuringAnswer,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringGroupId,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
  measuringQuestionFor,
  measuringSupportsSearch,
  measuringTargetKind,
  measuringTargetLabel,
} from "@/domain/questions";
import { type GeocodedPlace, GeocodedPlaceLeading } from "@/services/geo/geocoding";
import { measuringCategoryIcon } from "./measuringCategoryIcons";

type GroupFilter = "all" | MeasuringGroupId;

const GROUP_CHIP_LABEL: Record<MeasuringGroupId, string> = {
  transit: "Transit",
  borders: "Borders",
  natural: "Natural",
  poi: "Places",
  public_utilities: "Utilities",
};

const GROUP_CHIP_ICON: Record<GroupFilter, ComponentType<IconProps>> = {
  all: SquaresFourIcon,
  transit: TrainIcon,
  borders: BuildingsIcon,
  natural: TreeIcon,
  poi: MapPinAreaIcon,
  public_utilities: DropIcon,
};

const MEASURING_QUESTION_INTRO = {
  prompt: "Compared to me, are you closer to or further from [place]?",
  ruleSummary:
    "Pick what to measure below. Closer / further is relative to that place from your anchor.",
};

/** Flat measuring Ask HUD fields bag for MeasuringHudBody (W4-B peel). */
export type MeasuringHudBodyModel = {
  distanceUnit: DistanceUnit;
  optionChosen: boolean;
  measureFrom: MeasuringFromKind;
  usesAllPlacesInArea: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
  unavailableMeasuringFromKinds?: ReadonlySet<MeasuringFromKind>;
  catalogNotice?: string | null;
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
  onSearchResultSelect: (place: GeocodedPlace, role: MeasuringSearchRole) => void;
  onUseGps: () => void;
  onFindCoastline: () => void;
  onRetrySeaLevel: () => void;
  onFindLinearFeature: () => void;
  onFindNearest: () => void;
  onAnswerChange: (answer: MeasuringAnswer) => void;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  toolLabel?: string;
};

export type MeasuringHudBodyProps = {
  model: MeasuringHudBodyModel;
};

export function MeasuringHudBody({ model }: MeasuringHudBodyProps) {
  const {
    distanceUnit,
    optionChosen,
    measureFrom,
    usesAllPlacesInArea,
    usedMeasuringFromKinds,
    unavailableMeasuringFromKinds = new Set<MeasuringFromKind>(),
    catalogNotice = null,
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
    toolLabel = "Measuring",
  } = model;
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");

  const locationCategory: MeasuringLocationCategory | undefined =
    subject === "location" ? (measureFrom as MeasuringLocationCategory) : undefined;
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const measureCatalog = catalogOptions ?? BASE_MEASURING_CATALOG;

  const availableOptions = measureCatalog.filter(
    (option) =>
      !usedMeasuringFromKinds.has(option.id) && !unavailableMeasuringFromKinds.has(option.id),
  );
  const hasAvailableMeasureOptions = availableOptions.length > 0;

  const groupsWithRows = MEASURING_GROUPS.filter((group) =>
    measureCatalog.some((option) => option.groupId === group.id),
  );

  const effectiveFilter: GroupFilter =
    groupFilter === "all" || groupsWithRows.some((group) => group.id === groupFilter)
      ? groupFilter
      : "all";

  const filteredOptions =
    effectiveFilter === "all"
      ? measureCatalog
      : measureCatalog.filter((option) => option.groupId === effectiveFilter);

  const catalogRows = MEASURING_GROUPS.flatMap((group) =>
    filteredOptions
      .filter((option) => option.groupId === group.id)
      .map((option) => {
        const Icon = measuringCategoryIcon(option.id);
        return {
          id: option.id,
          label: option.label,
          groupLabel: effectiveFilter === "all" ? group.label : undefined,
          disabled:
            (usedMeasuringFromKinds.has(option.id) ||
              unavailableMeasuringFromKinds.has(option.id)) &&
            !(optionChosen && option.id === measureFrom),
          icon: <Icon size={20} weight="duotone" color="currentColor" aria-hidden />,
        };
      }),
  );

  const question = optionChosen
    ? measuringQuestionFor(subject, locationCategory)
    : MEASURING_QUESTION_INTRO;

  const anchorLoadingMessage = anchorResolveLoadingMessage(subject, measureFrom, locationCategory);

  const showAnswer =
    hasAvailableMeasureOptions &&
    hasSeekerPoint &&
    hasTargetPoint &&
    distanceMeters !== null &&
    optionChosen;

  const chord: "anchor" | "source" | "target" | "answer" = !optionChosen
    ? "source"
    : !hasSeekerPoint
      ? "anchor"
      : showAnswer
        ? "answer"
        : "target";

  const filterOptions: { value: GroupFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...groupsWithRows.map((group) => ({
      value: group.id as GroupFilter,
      label: GROUP_CHIP_LABEL[group.id],
    })),
  ];

  return (
    <div data-testid="measuring-hud-body" className="ask-hud-mode-body flex w-full flex-col gap-2">
      <AskToolQuestionHeader
        toolLabel={toolLabel}
        costLabel={costLabel}
        icon={<HudMeasuringIcon width={22} height={22} />}
        prompt={question.prompt}
        ruleSummary={question.ruleSummary}
        mantine={true}
      />

      {chord === "source" ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          {catalogNotice ? (
            <ResolvedReadout variant="warning">{catalogNotice}</ResolvedReadout>
          ) : null}
          {!hasAvailableMeasureOptions ? (
            <AskHudPanel className="p-3">
              <CatalogExhaustedMessage message="Every measure category has already been used on this map." />
            </AskHudPanel>
          ) : null}
          <div
            role="tablist"
            aria-label="Filter measure categories"
            className="jl-scroll"
            style={filterChipTrackStyle}
          >
            {filterOptions.map((option) => {
              const selected = effectiveFilter === option.value;
              const Icon = GROUP_CHIP_ICON[option.value];
              return (
                <UnstyledButton
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setGroupFilter(option.value)}
                  styles={filterChipStyles(selected)}
                >
                  <Icon size={14} weight={selected ? "fill" : "regular"} aria-hidden />
                  {option.label}
                </UnstyledButton>
              );
            })}
          </div>
          <AskCatalogRail
            rows={catalogRows}
            selectedId={optionChosen ? measureFrom : null}
            onSelect={(id) => onMeasureFromChange(id as MeasuringFromKind)}
            aria-label="Measuring from"
            hint=""
            columns={2}
          />
        </div>
      ) : null}

      {chord === "anchor" ? (
        <AskHudPanel className="p-3">
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
        </AskHudPanel>
      ) : null}

      {chord === "target" ? (
        <AskHudPanel className="space-y-2 p-3">
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
        </AskHudPanel>
      ) : null}

      {chord === "answer" ? (
        <AskHudPanel className="p-3">
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
        </AskHudPanel>
      ) : null}

      {allowsSearch && searchResults.length > 0 && chord !== "answer" ? (
        <AskHudPanel className="jl-scroll max-h-40 p-2">
          <SearchResultsList
            results={searchResults}
            onSelect={(place) => onSearchResultSelect(place, searchRole)}
            renderLeading={(place) => <GeocodedPlaceLeading category={place.placeCategory} />}
          />
        </AskHudPanel>
      ) : null}
    </div>
  );
}
