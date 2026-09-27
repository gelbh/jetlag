import { AskHudPanel } from "@/components/tools/ask/AskHudPanel";
/**
 * Matching Ask HUD mode body — CatalogRail → map resolve (+ solo answer).
 * SingleBottomChord: row tap advances; no PhaseRail / CONTINUE.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { createElement, useState, type ComponentType } from "react";
import { UnstyledButton } from "@mantine/core";
import {
  Buildings,
  MapPinArea,
  SquaresFour,
  Train,
  Tree,
  Wrench,
  type IconProps,
} from "@phosphor-icons/react";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskToolQuestionHeader } from "@/components/tools/ask/AskToolQuestionHeader";
import { HudMatchingIcon } from "@/components/map/icons/ToolIcons";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { AnchorControls } from "@/components/tools/shared/controls/AnchorControls";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { LoadingReadout } from "@/components/tools/shared/readout/LoadingReadout";
import { ProvisionalBadge } from "@/components/tools/shared/readout/ProvisionalBadge";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import {
  askInsetSurfaceStyle,
  filterChipStyles,
  filterChipTrackStyle,
} from "@/components/ui/entry/entryChrome";
import { formatDistance, type DistanceUnit } from "@/domain/map/distance";
import {
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
  matchingQuestionFor,
  type MatchingAnswer,
  type MatchingCategoryDefinition,
  type MatchingCategoryGroupId,
  type MatchingCategoryId,
} from "@/domain/questions";
import {
  matchingFeatureCountLabel,
  matchingNullAnswerMessage,
} from "@/services/geo/matching";
import { matchingCategoryIcon } from "./matchingCategoryIcons";

type GroupFilter = "all" | MatchingCategoryGroupId;

const GROUP_CHIP_LABEL: Record<MatchingCategoryGroupId, string> = {
  transit: "Transit",
  administrative_divisions: "Admin",
  natural: "Natural",
  places_of_interest: "Places",
  public_utilities: "Utilities",
};

const GROUP_CHIP_ICON: Record<
  GroupFilter,
  ComponentType<IconProps>
> = {
  all: SquaresFour,
  transit: Train,
  administrative_divisions: Buildings,
  natural: Tree,
  places_of_interest: MapPinArea,
  public_utilities: Wrench,
};

const MATCHING_QUESTION_INTRO = {
  prompt: "Is your nearest [place] the same as my nearest [place]?",
  ruleSummary:
    "Pick a category below. Yes means you both share the same nearest place of that type.",
};

export type MatchingHudBodyProps = {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId | null;
  categoryChosen: boolean;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
  catalogCategories?: readonly MatchingCategoryDefinition[];
  hasSeekerPoint: boolean;
  usesContainmentMatching: boolean;
  nearestFeatureName: string | null;
  distanceMeters: number | null;
  featureCount: number | null;
  inPlayAreaFeatureCount: number | null;
  nearestOutsidePlayArea: boolean;
  nullAnswer: boolean;
  loading: boolean;
  nearestProvisional?: boolean;
  gpsLoading: boolean;
  answer: MatchingAnswer | null;
  error?: string | null;
  onCategoryChange: (categoryId: MatchingCategoryId) => void;
  onUseGps: () => void;
  onAnswerChange: (answer: MatchingAnswer) => void;
  awaitHiderAnswer?: boolean;
  /** Shown inside the question box (Matching · D3P1). */
  costLabel?: string | null;
  toolLabel?: string;
};

export function MatchingHudBody({
  distanceUnit,
  categoryId,
  categoryChosen,
  usedCategoryIds,
  catalogCategories = MATCHING_CATEGORIES,
  hasSeekerPoint,
  usesContainmentMatching,
  nearestFeatureName,
  distanceMeters,
  featureCount,
  inPlayAreaFeatureCount,
  nearestOutsidePlayArea,
  nullAnswer,
  loading,
  nearestProvisional = false,
  gpsLoading,
  answer,
  error = null,
  onCategoryChange,
  onUseGps,
  onAnswerChange,
  awaitHiderAnswer = false,
  costLabel = null,
  toolLabel = "Matching",
}: MatchingHudBodyProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");

  const selectableCategories = catalogCategories.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) &&
      (!usedCategoryIds.has(item.id) || item.id === categoryId),
  );
  const availableCategories = catalogCategories.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) && !usedCategoryIds.has(item.id),
  );

  const groupsWithRows = MATCHING_CATEGORY_GROUPS.filter((group) =>
    selectableCategories.some((cat) => cat.groupId === group.id),
  );

  const effectiveFilter: GroupFilter =
    groupFilter === "all" ||
    groupsWithRows.some((group) => group.id === groupFilter)
      ? groupFilter
      : "all";

  const filteredCategories =
    effectiveFilter === "all"
      ? selectableCategories
      : selectableCategories.filter((cat) => cat.groupId === effectiveFilter);

  const catalogRows = MATCHING_CATEGORY_GROUPS.flatMap((group) =>
    filteredCategories
      .filter((cat) => cat.groupId === group.id)
      .map((cat) => {
        const Icon = matchingCategoryIcon(cat.id);
        return {
          id: cat.id,
          label: cat.label,
          groupLabel: effectiveFilter === "all" ? group.label : undefined,
          icon: (
            <Icon
              size={20}
              weight="duotone"
              color="currentColor"
              aria-hidden
            />
          ),
        };
      }),
  );

  const category = categoryId
    ? catalogCategories.find((item) => item.id === categoryId)
    : null;
  const question =
    categoryId != null
      ? matchingQuestionFor(categoryId)
      : MATCHING_QUESTION_INTRO;
  const categoryIcon = category ? matchingCategoryIcon(category.id) : null;
  const usesLandmassMatching = category?.resolver === "landmass";
  const resolveComplete = nullAnswer || nearestFeatureName !== null;

  const chord: "category" | "resolve" | "answer" = !categoryChosen
    ? "category"
    : !awaitHiderAnswer && resolveComplete && hasSeekerPoint && !loading
      ? "answer"
      : "resolve";

  const loadingMessage = loading
    ? usesContainmentMatching
      ? usesLandmassMatching
        ? "Finding landmass at your anchor…"
        : "Finding division at your anchor…"
      : nearestProvisional && nearestFeatureName
        ? "Confirming nearest feature…"
        : "Finding nearest feature…"
    : null;

  const featureCountLabel =
    featureCount !== null && inPlayAreaFeatureCount !== null
      ? matchingFeatureCountLabel(
          featureCount,
          inPlayAreaFeatureCount,
          usesContainmentMatching,
          usesLandmassMatching,
        )
      : undefined;

  const nearestFeatureSummary = nearestFeatureName
    ? `${nearestFeatureName}${
        !usesContainmentMatching &&
        distanceMeters !== null &&
        !nearestProvisional
          ? ` · ${formatDistance(distanceMeters, distanceUnit)} from you`
          : ""
      }${nearestOutsidePlayArea ? " · outside play area" : ""}`
    : null;

  const filterOptions: { value: GroupFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...groupsWithRows.map((group) => ({
      value: group.id as GroupFilter,
      label: GROUP_CHIP_LABEL[group.id],
    })),
  ];

  return (
    <div
      data-testid="matching-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      <AskToolQuestionHeader
        toolLabel={toolLabel}
        costLabel={costLabel}
        icon={<HudMatchingIcon width={22} height={22} />}
        prompt={question.prompt}
        ruleSummary={question.ruleSummary}
        mantine={true}
      />

      {chord === "category" ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          {availableCategories.length === 0 ? (
            <AskHudPanel className="p-3">
              <CatalogExhaustedMessage message="Every match category has already been used on this map." />
            </AskHudPanel>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Filter match categories"
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
                      <Icon
                        size={14}
                        weight={selected ? "fill" : "regular"}
                        aria-hidden
                      />
                      {option.label}
                    </UnstyledButton>
                  );
                })}
              </div>
              <AskCatalogRail
                rows={catalogRows}
                selectedId={categoryChosen ? categoryId : null}
                onSelect={(id) => {
                  if (!isMatchingCategoryAvailable(id as MatchingCategoryId)) {
                    return;
                  }
                  onCategoryChange(id as MatchingCategoryId);
                }}
                aria-label="Match category"
                hint=""
                columns={2}
              />
            </>
          )}
        </div>
      ) : null}

      {chord === "resolve" ? (
        <div
          className="pointer-events-auto space-y-3 p-3"
          style={askInsetSurfaceStyle}
        >
          {category ? (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-flex shrink-0 items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor:
                    "oklch(from var(--color-flag) l c h / 0.14)",
                  color: "var(--color-flag)",
                }}
              >
                {categoryIcon
                  ? createElement(categoryIcon, { size: 18, weight: "duotone" })
                  : null}
              </span>
              <div className="min-w-0">
                <p
                  className="m-0 text-xs font-semibold"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  Category
                </p>
                <p className="m-0 truncate text-sm font-semibold text-field-ink">
                  {category.label}
                </p>
              </div>
            </div>
          ) : null}
          <AnchorControls
            gpsLoading={gpsLoading}
            hasAnchor={hasSeekerPoint}
            onUseGps={onUseGps}
          />
          {loadingMessage !== null ? (
            <LoadingReadout>{loadingMessage}</LoadingReadout>
          ) : null}
          {nullAnswer && categoryId ? (
            <ResolvedReadout variant="warning">
              {matchingNullAnswerMessage(categoryId)}
            </ResolvedReadout>
          ) : nearestFeatureSummary ? (
            <div
              style={{
                borderRadius: 12,
                padding: "0.65rem 0.75rem",
                backgroundColor:
                  "oklch(from var(--color-field-ink) l c h / 0.05)",
                border:
                  "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
              }}
            >
              <ResolvedReadout caption={featureCountLabel}>
                <span className="inline-flex flex-wrap items-center">
                  {nearestFeatureSummary}
                  {nearestProvisional ? <ProvisionalBadge /> : null}
                </span>
              </ResolvedReadout>
            </div>
          ) : !loading && hasSeekerPoint ? (
            <ResolvedReadout variant="dim">
              Looking up the nearest feature…
            </ResolvedReadout>
          ) : !hasSeekerPoint ? (
            <ResolvedReadout variant="dim">
              Tap the map to set your anchor.
            </ResolvedReadout>
          ) : null}
          {error ? <AskInlineError message={error} /> : null}
        </div>
      ) : null}

      {chord === "answer" ? (
        <div
          className="pointer-events-auto space-y-3 p-3"
          style={askInsetSurfaceStyle}
        >
          {category ? (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-flex shrink-0 items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor:
                    "oklch(from var(--color-flag) l c h / 0.14)",
                  color: "var(--color-flag)",
                }}
              >
                {categoryIcon
                  ? createElement(categoryIcon, { size: 18, weight: "duotone" })
                  : null}
              </span>
              <div className="min-w-0">
                <p
                  className="m-0 text-xs font-semibold"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  Category
                </p>
                <p className="m-0 truncate text-sm font-semibold text-field-ink">
                  {category.label}
                </p>
              </div>
            </div>
          ) : null}
          {nearestFeatureSummary ? (
            <div
              style={{
                borderRadius: 12,
                padding: "0.65rem 0.75rem",
                backgroundColor:
                  "oklch(from var(--color-field-ink) l c h / 0.05)",
                border:
                  "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
              }}
            >
              <ResolvedReadout caption={featureCountLabel}>
                {nearestFeatureSummary}
              </ResolvedReadout>
            </div>
          ) : null}
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={yesNoAnswerOptions}
            label=""
          />
        </div>
      ) : null}
    </div>
  );
}
