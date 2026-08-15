/**
 * Matching Ask HUD mode body — CatalogRail → map resolve (+ solo answer).
 * SingleBottomChord: row tap advances; no PhaseRail / CONTINUE.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { AnchorControls } from "@/components/tools/shared/controls/AnchorControls";
import { CatalogExhaustedMessage } from "@/components/tools/shared/readout/CatalogExhaustedMessage";
import { LoadingReadout } from "@/components/tools/shared/readout/LoadingReadout";
import { ProvisionalBadge } from "@/components/tools/shared/readout/ProvisionalBadge";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { formatDistance, type DistanceUnit } from "@/domain/map/distance";
import {
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
  type MatchingAnswer,
  type MatchingCategoryDefinition,
  type MatchingCategoryId,
} from "@/domain/questions";
import {
  matchingFeatureCountLabel,
  matchingNullAnswerMessage,
} from "@/services/geo/matching";

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
}: MatchingHudBodyProps) {
  const selectableCategories = catalogCategories.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) &&
      (!usedCategoryIds.has(item.id) || item.id === categoryId),
  );
  const availableCategories = catalogCategories.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) && !usedCategoryIds.has(item.id),
  );

  const catalogRows = MATCHING_CATEGORY_GROUPS.flatMap((group) =>
    selectableCategories
      .filter((cat) => cat.groupId === group.id)
      .map((cat) => ({
        id: cat.id,
        label: `${group.label}: ${cat.label}`,
      })),
  );

  const category = categoryId
    ? catalogCategories.find((item) => item.id === categoryId)
    : null;
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

  return (
    <div
      data-testid="matching-hud-body"
      className="ask-hud-mode-body mx-auto flex max-w-xl flex-col gap-2"
    >
      {chord === "category" ? (
        <div className="space-y-2">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          {availableCategories.length === 0 ? (
            <div className="pointer-events-auto hud-panel p-3">
              <CatalogExhaustedMessage message="Every match category has already been used on this map." />
            </div>
          ) : (
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
              hint="Tap a row to set the match category"
            />
          )}
        </div>
      ) : null}

      {chord === "resolve" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
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
            <ResolvedReadout caption={featureCountLabel}>
              <span className="inline-flex flex-wrap items-center">
                {nearestFeatureSummary}
                {nearestProvisional ? <ProvisionalBadge /> : null}
              </span>
            </ResolvedReadout>
          ) : !loading && hasSeekerPoint ? (
            <ResolvedReadout variant="dim">
              Looking up the nearest feature…
            </ResolvedReadout>
          ) : !hasSeekerPoint ? (
            <ResolvedReadout variant="dim">
              Tap the map to set your anchor.
            </ResolvedReadout>
          ) : null}
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : null}
        </div>
      ) : null}

      {chord === "answer" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          {nearestFeatureSummary ? (
            <ResolvedReadout caption={featureCountLabel}>
              {nearestFeatureSummary}
            </ResolvedReadout>
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
