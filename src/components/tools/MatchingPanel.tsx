import { type RefObject } from "react";
import {
  isMatchingCategoryEnabled,
  isMatchingCategoryAvailable,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
  matchingQuestionFor,
  type MatchingAnswer,
  type MatchingCategoryDefinition,
  type MatchingCategoryId,
} from "../../domain/questions";
import { resolveMatchingCategory } from "../../domain/session/catalog/sessionCustomCatalog";
import { matchingFeatureCountLabel, matchingNullAnswerMessage } from "../../services/geo/matching";
import { formatDistance, type DistanceUnit } from "../../domain/map/distance";
import { GroupedSelectField } from "../ui/forms/GroupedSelectField";
import { yesNoAnswerOptions } from "./shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/answers/BinaryAnswerPicker";
import { AnchorControls } from "./shared/controls/AnchorControls";
import { CoordinateCopyButton } from "./shared/controls/CoordinateCopyButton";
import { ErrorWithRetry } from "./shared/readout/ErrorWithRetry";
import { LoadingReadout } from "./shared/readout/LoadingReadout";
import { CatalogExhaustedMessage } from "./shared/readout/CatalogExhaustedMessage";
import { QuestionPromptBlock } from "./shared/controls/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/readout/ResolvedReadout";
import { ToolPanelShell } from "./shared/panels/ToolPanelShell";
import { ToolSection } from "./shared/panels/ToolSection";
import { SendToHidersButton } from "./shared/controls/SendToHidersButton";
import { WizardPanelFrame } from "./shared/wizard/WizardPanelFrame";
import { WizardSwipeSurface } from "./shared/wizard/WizardSwipeSurface";
import { MATCHING_STEPS, stepsForMode } from "./shared/wizard/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/wizard/toolWizardGuards";
import { useToolWizard } from "../../hooks/wizard/useToolWizard";
import { QuestionTruthReferenceHint } from "./shared/QuestionTruthReferenceHint";

interface MatchingPanelProps {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId | null;
  categoryChosen: boolean;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
  catalogCategories?: readonly MatchingCategoryDefinition[];
  anchorLat?: number | null;
  anchorLng?: number | null;
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
  wizardStepRef?: RefObject<string>;
}

export function MatchingPanel({
  distanceUnit,
  categoryId,
  categoryChosen,
  usedCategoryIds,
  catalogCategories = MATCHING_CATEGORIES,
  anchorLat = null,
  anchorLng = null,
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
  wizardStepRef,
}: MatchingPanelProps) {
  const steps = stepsForMode(MATCHING_STEPS, awaitHiderAnswer);
  const {
    stepId: step,
    stepIndex,
    setStepIndex,
    goNext,
    goBack,
    Stepper,
  } = useToolWizard(steps, { wizardStepRef });
  const categoryStepIndex = steps.findIndex((item) => item.id === "category");

  const handleCategoryChange = (nextCategoryId: MatchingCategoryId) => {
    onCategoryChange(nextCategoryId);
    if (categoryStepIndex >= 0) {
      setStepIndex(categoryStepIndex);
    }
  };

  const question = categoryId
    ? (() => {
        const resolved =
          catalogCategories.find((item) => item.id === categoryId) ??
          resolveMatchingCategory(categoryId);
        return resolved
          ? {
              category: categoryId,
              prompt: `Is your nearest ${resolved.promptNoun} the same as my nearest ${resolved.promptNoun}?`,
              ruleSummary: resolved.ruleSummary,
            }
          : matchingQuestionFor(categoryId);
      })()
    : null;
  const category = categoryId
    ? catalogCategories.find((item) => item.id === categoryId) ??
      resolveMatchingCategory(categoryId)
    : null;
  const usesLandmassMatching = category?.resolver === "landmass";
  const categoryAvailable =
    categoryId !== null && isMatchingCategoryAvailable(categoryId);
  const resolveComplete = nullAnswer || nearestFeatureName !== null;
  const canCommit =
    hasSeekerPoint &&
    (awaitHiderAnswer || answer !== null) &&
    resolveComplete &&
    categoryAvailable &&
    !loading &&
    !isSubmitting;
  const selectableCategories = catalogCategories.filter(
    (item) =>
      isMatchingCategoryEnabled(item.id) &&
      (!usedCategoryIds.has(item.id) || item.id === categoryId),
  );
  const availableCategories = catalogCategories.filter(
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

  const canGoNext =
    (step === "anchor" && hasSeekerPoint && !loading) ||
    (step === "category" && categoryAvailable && categoryChosen) ||
    (step === "resolve" && resolveComplete && !loading);
  const canSwipeNext = toolWizardSwipeNext(canGoNext, stepIndex, steps.length);

  const matchingAnswerStepReadout =
    step === "answer" && !nullAnswer && nearestFeatureSummary ? (
      <ResolvedReadout caption={featureCountLabel}>
        {nearestFeatureSummary}
      </ResolvedReadout>
    ) : null;

  const matchingAnswerStepActions =
    step === "answer" ? (
      <>
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
      </>
    ) : null;

  const matchingResolveSendActions =
    step === "resolve" && awaitHiderAnswer ? (
      <SendToHidersButton
        costLabel={costLabel}
        isSubmitting={isSubmitting}
        disabled={!canCommit}
        onClick={onCommit}
        instruction="Hiders answer yes or no in game chat once you send this question."
      />
    ) : null;

  const panelBody = (
    <>
      {step === "category" ? (
        <ToolSection first compact status="active">
          {awaitHiderAnswer ? (
            <QuestionTruthReferenceHint />
          ) : null}
          {availableCategories.length === 0 ? (
            <CatalogExhaustedMessage message="Every match category has already been used on this map." />
          ) : (
            <GroupedSelectField
              label="Match category"
              value={categoryChosen && categoryId ? categoryId : ""}
              placeholder="Choose a category"
              groups={MATCHING_CATEGORY_GROUPS.map((group) => ({
                id: group.id,
                label: group.label,
                options: selectableCategories
                  .filter((cat) => cat.groupId === group.id)
                  .map((cat) => ({ value: cat.id, label: cat.label })),
              })).filter((group) => group.options.length > 0)}
              onChange={(value) =>
                handleCategoryChange(value as MatchingCategoryId)
              }
            />
          )}
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
          />
          {hasSeekerPoint &&
          typeof anchorLat === "number" &&
          typeof anchorLng === "number" ? (
            <CoordinateCopyButton lat={anchorLat} lng={anchorLng} className="w-full" />
          ) : null}
          {loading && hasSeekerPoint ? loadingIndicator : null}
        </ToolSection>
      ) : null}

      {step === "resolve" ? (
        <ToolSection first compact status="active">
          {loadingIndicator}
          {nullAnswer && categoryId ? (
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
        </ToolSection>
      ) : null}

      {step === "answer" && matchingAnswerStepReadout ? (
        <ToolSection first compact status="active">
          {matchingAnswerStepReadout}
        </ToolSection>
      ) : null}
    </>
  );

  const stickyFooterActions =
    step === "answer"
      ? matchingAnswerStepActions
      : step === "resolve"
        ? matchingResolveSendActions
        : null;

  const answerFooter = stickyFooterActions ? (
    <ToolSection first compact status="active">
      {stickyFooterActions}
    </ToolSection>
  ) : undefined;

  return (
    <ToolPanelShell
      toolId="matching"
      fillHeight
      stepper={
        <Stepper
          nav={{
            stepIndex,
            stepCount: steps.length,
            onBack: goBack,
            onNext: goNext,
            canGoNext,
          }}
        />
      }
    >
      <WizardPanelFrame
        scrollable
        stickyFooter={answerFooter}
        trailing={
          error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null
        }
      >
        <WizardSwipeSurface
          stepId={step}
          stepIndex={stepIndex}
          canGoBack={stepIndex > 0}
          canGoNext={canSwipeNext}
          onBack={goBack}
          onNext={goNext}
        >
          {panelBody}
        </WizardSwipeSurface>
      </WizardPanelFrame>
    </ToolPanelShell>
  );
}
