import {
  getMatchingCategory,
  isMatchingCategoryEnabled,
  isMatchingCategoryAvailable,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
  matchingQuestionFor,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/matchingQuestions";
import { formatDistance, type DistanceUnit } from "../../domain/distance";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { ToolPanelShell } from "./shared/ToolPanelShell";

interface MatchingPanelProps {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
  usesContainmentMatching: boolean;
  hasSeekerPoint: boolean;
  nearestFeatureName: string | null;
  distanceMeters: number | null;
  featureCount: number | null;
  nullAnswer: boolean;
  loading: boolean;
  gpsLoading: boolean;
  answer: MatchingAnswer | null;
  error?: string | null;
  onCategoryChange: (categoryId: MatchingCategoryId) => void;
  onUseGps: () => void;
  onResolveNearest: () => void;
  onAnswerChange: (answer: MatchingAnswer) => void;
  onCommit: () => void;
}

export function MatchingPanel({
  distanceUnit,
  categoryId,
  usedCategoryIds,
  usesContainmentMatching,
  hasSeekerPoint,
  nearestFeatureName,
  distanceMeters,
  featureCount,
  nullAnswer,
  loading,
  gpsLoading,
  answer,
  error,
  onCategoryChange,
  onUseGps,
  onResolveNearest,
  onAnswerChange,
  onCommit,
}: MatchingPanelProps) {
  const question = matchingQuestionFor(categoryId);
  const category = getMatchingCategory(categoryId);
  const usesLandmassMatching = category.resolver === "landmass";
  const canCommit =
    hasSeekerPoint &&
    answer !== null &&
    (nullAnswer || nearestFeatureName !== null) &&
    isMatchingCategoryAvailable(categoryId, usedCategoryIds);
  const availableCategories = MATCHING_CATEGORIES.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) && !usedCategoryIds.has(item.id),
  );

  return (
    <ToolPanelShell
      toolId="matching"
      helper={
        usesContainmentMatching
          ? usesLandmassMatching
            ? "Resolve the landmass at your anchor, then record the answer."
            : "Resolve the administrative division at your anchor, then record the answer."
          : "Resolve your nearest feature in the play area, then record the answer."
      }
    >
      <label className="block text-sm text-slate-300">
        Category
        {availableCategories.length === 0 ? (
          <p className="mt-1 text-sm text-amber-200">
            Every match category has already been used on this map.
          </p>
        ) : (
          <select
            value={categoryId}
            onChange={(event) =>
              onCategoryChange(event.target.value as MatchingCategoryId)
            }
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          >
            {MATCHING_CATEGORY_GROUPS.map((group) => {
              const categories = MATCHING_CATEGORIES.filter(
                (category) =>
                  category.groupId === group.id &&
                  isMatchingCategoryEnabled(category.id) &&
                  !usedCategoryIds.has(category.id),
              );

              if (categories.length === 0) {
                return null;
              }

              return (
                <optgroup key={group.id} label={group.label}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        )}
      </label>
      <p className="text-sm font-medium text-slate-100">{question.prompt}</p>
      <p className="text-xs text-slate-400">{question.ruleSummary}</p>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">Your anchor</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onUseGps}
            disabled={gpsLoading}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
          >
            {gpsLoading ? "Reading GPS…" : "Use my location"}
          </button>
          <div className="flex min-h-12 items-center rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300">
            {hasSeekerPoint ? "Pinned on map" : "Tap map for anchor"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">
          {usesContainmentMatching
            ? usesLandmassMatching
              ? "Landmass at anchor"
              : "Division at anchor"
            : "Nearest feature"}
        </p>
        <button
          type="button"
          onClick={onResolveNearest}
          disabled={!hasSeekerPoint || loading}
          className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
        >
          {loading
            ? usesContainmentMatching
              ? usesLandmassMatching
                ? "Resolving landmass…"
                : "Resolving division…"
              : "Resolving nearest…"
            : usesContainmentMatching
              ? usesLandmassMatching
                ? "Resolve landmass"
                : "Resolve division"
              : "Resolve nearest"}
        </button>
        {nullAnswer ? (
          <p className="text-sm text-amber-200">
            {usesContainmentMatching
              ? usesLandmassMatching
                ? "No landmass intersects the play area. This is a null answer."
                : "No administrative division at this level intersects the play area. This is a null answer."
              : "No in-bounds features for this category. This is a null answer."}
          </p>
        ) : nearestFeatureName ? (
          <p className="text-sm text-slate-300">
            {nearestFeatureName}
            {!usesContainmentMatching && distanceMeters !== null
              ? ` · ${formatDistance(distanceMeters, distanceUnit)} from you`
              : ""}
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            {usesContainmentMatching
              ? usesLandmassMatching
                ? "No landmass yet."
                : "No division yet."
              : "No nearest feature yet."}
          </p>
        )}
        {featureCount !== null ? (
          <p className="text-xs text-slate-500">
            {featureCount}{" "}
            {usesContainmentMatching
              ? usesLandmassMatching
                ? `landmass${featureCount === 1 ? "" : "es"}`
                : `division${featureCount === 1 ? "" : "s"}`
              : `feature${featureCount === 1 ? "" : "s"}`}{" "}
            in play area
          </p>
        ) : null}
      </div>

      <BinaryAnswerPicker
        value={answer}
        onChange={onAnswerChange}
        options={[
          {
            value: "yes",
            label: "Yes",
            activeClassName: "bg-emerald-500 text-slate-950",
          },
          {
            value: "no",
            label: "No",
            activeClassName: "bg-rose-500 text-slate-50",
          },
        ]}
      />

      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add match question
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </ToolPanelShell>
  );
}
