import { useState } from "react";
import {
  getMatchingCategory,
  isMatchingCategoryEnabled,
  isMatchingCategoryAvailable,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
  matchingQuestionFor,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/questions/matchingQuestions";
import { matchingFeatureCountLabel, matchingNullAnswerMessage } from "../../services/geo/matchingFeatures";
import { formatDistance, type DistanceUnit } from "../../domain/map/distance";
import { yesNoAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { AnchorControls } from "./shared/AnchorControls";
import { ErrorWithRetry } from "./shared/ErrorWithRetry";
import { LoadingReadout } from "./shared/LoadingReadout";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  MATCHING_STEPS,
  stepsForMode,
} from "./shared/toolStepUtils";

interface MatchingPanelProps {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
  usesContainmentMatching: boolean;
  hasSeekerPoint: boolean;
  nearestFeatureName: string | null;
  distanceMeters: number | null;
  featureCount: number | null;
  inPlayAreaFeatureCount: number | null;
  nearestOutsidePlayArea: boolean;
  nullAnswer: boolean;
  loading: boolean;
  gpsLoading: boolean;
  answer: MatchingAnswer | null;
  error?: string | null;
  onCategoryChange: (categoryId: MatchingCategoryId) => void;
  onUseGps: () => void;
  onAnswerChange: (answer: MatchingAnswer) => void;
  onCommit: () => void;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  onRetry?: () => void;
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
  inPlayAreaFeatureCount,
  nearestOutsidePlayArea,
  nullAnswer,
  loading,
  gpsLoading,
  answer,
  error,
  onCategoryChange,
  onUseGps,
  onAnswerChange,
  onCommit,
  awaitHiderAnswer = false,
  costLabel = "D3P1",
  isSubmitting = false,
  onRetry,
}: MatchingPanelProps) {
  const steps = stepsForMode(MATCHING_STEPS, awaitHiderAnswer);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex]?.id ?? "anchor";
  const categoryStepIndex = steps.findIndex((item) => item.id === "category");

  const handleCategoryChange = (nextCategoryId: MatchingCategoryId) => {
    onCategoryChange(nextCategoryId);
    if (categoryStepIndex >= 0) {
      setStepIndex(categoryStepIndex);
    }
  };

  const question = matchingQuestionFor(categoryId);
  const category = getMatchingCategory(categoryId);
  const usesLandmassMatching = category.resolver === "landmass";
  const categoryAvailable = isMatchingCategoryAvailable(categoryId);
  const resolveComplete = nullAnswer || nearestFeatureName !== null;
  const canCommit =
    hasSeekerPoint &&
    (awaitHiderAnswer || answer !== null) &&
    resolveComplete &&
    categoryAvailable &&
    !loading &&
    !isSubmitting;
  const selectableCategories = MATCHING_CATEGORIES.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) &&
      (!usedCategoryIds.has(item.id) || item.id === categoryId),
  );
  const availableCategories = MATCHING_CATEGORIES.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) && !usedCategoryIds.has(item.id),
  );

  const loadingMessage = loading
    ? usesContainmentMatching
      ? usesLandmassMatching
        ? "Finding landmass at your anchor…"
        : "Finding division at your anchor…"
      : "Finding nearest feature…"
    : null;

  const loadingIndicator =
    loadingMessage !== null ? (
      <LoadingReadout>{loadingMessage}</LoadingReadout>
    ) : null;

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
        !usesContainmentMatching && distanceMeters !== null
          ? ` · ${formatDistance(distanceMeters, distanceUnit)} from you`
          : ""
      }${nearestOutsidePlayArea ? " · outside play area" : ""}`
    : null;

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const stepper = (
    <ToolStepper
      steps={buildSteps(steps, deriveStepStates(steps.length, stepIndex))}
    />
  );

  return (
    <ToolPanelShell toolId="matching" stepper={stepper}>
      {step === "category" ? (
        <ToolSection first compact status="active">
          {availableCategories.length === 0 ? (
            <p className="text-sm text-status-warning">
              Every match category has already been used on this map.
            </p>
          ) : (
            <label className="field-label">
              Match category
              <select
                value={categoryId}
                onChange={(event) =>
                  handleCategoryChange(
                    event.target.value as MatchingCategoryId,
                  )
                }
                className="field-input"
              >
                {MATCHING_CATEGORY_GROUPS.map((group) => {
                  const categories = selectableCategories.filter(
                    (cat) => cat.groupId === group.id,
                  );

                  if (categories.length === 0) {
                    return null;
                  }

                  return (
                    <optgroup key={group.id} label={group.label}>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
          )}
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
          />
          {loading && hasSeekerPoint ? loadingIndicator : null}
        </ToolSection>
      ) : null}

      {step === "resolve" ? (
        <ToolSection first compact status="active">
          {loadingIndicator}
          {nullAnswer ? (
            <ResolvedReadout variant="warning">
              {matchingNullAnswerMessage(categoryId)}
            </ResolvedReadout>
          ) : nearestFeatureSummary ? (
            <ResolvedReadout caption={featureCountLabel}>
              {nearestFeatureSummary}
            </ResolvedReadout>
          ) : !loading ? (
            <ResolvedReadout variant="dim">
              Set your anchor to look up the nearest feature.
            </ResolvedReadout>
          ) : null}
          {awaitHiderAnswer ? (
            <>
              <p className="text-xs text-ink-dim">
                Hiders answer yes or no in game chat once you send this question.
              </p>
              <button
                type="button"
                onClick={onCommit}
                disabled={!canCommit}
                aria-busy={isSubmitting}
                className="btn-primary w-full disabled:opacity-40"
              >
                {isSubmitting ? "Sending…" : `Send to hiders (${costLabel})`}
              </button>
            </>
          ) : null}
        </ToolSection>
      ) : null}

      {step === "answer" ? (
        <ToolSection first compact status="active">
          {!nullAnswer && nearestFeatureSummary ? (
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
          {resolveComplete && !nullAnswer ? (
            <p className="text-xs text-ink-dim">
              The map shows the shaded area for your choice.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit}
            aria-busy={isSubmitting}
            className="btn-primary w-full disabled:opacity-40"
          >
            {isSubmitting ? "Sending…" : "Add match question"}
          </button>
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "anchor" &&
            hasSeekerPoint &&
            !loading &&
            resolveComplete) ||
          (step === "category" && categoryAvailable) ||
          (step === "resolve" && resolveComplete && !loading)
        }
      />

      {error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null}
    </ToolPanelShell>
  );
}
