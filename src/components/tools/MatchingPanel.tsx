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
import { resolveMatchingCategory } from "../../domain/session/sessionCustomCatalog";
import { matchingFeatureCountLabel, matchingNullAnswerMessage } from "../../services/geo/matchingFeatures";
import { formatDistance, type DistanceUnit } from "../../domain/map/distance";
import { GroupedSelectField } from "../ui/GroupedSelectField";
import { yesNoAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { AnchorControls } from "./shared/AnchorControls";
import { CoordinateCopyButton } from "./shared/CoordinateCopyButton";
import { ErrorWithRetry } from "./shared/ErrorWithRetry";
import { LoadingReadout } from "./shared/LoadingReadout";
import { CatalogExhaustedMessage } from "./shared/CatalogExhaustedMessage";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { SendToHidersButton } from "./shared/SendToHidersButton";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { WizardToolPanelLayout } from "./shared/WizardToolPanelLayout";
import { MATCHING_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/toolWizardGuards";
import { useToolWizard } from "../../hooks/useToolWizard";
import type { ToolPanelSandboxMode } from "./shared/toolPanelSandbox";

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
  sandbox?: ToolPanelSandboxMode;
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
  sandbox,
}: MatchingPanelProps) {
  const readOnly = sandbox?.readOnly ?? false;
  const embeddedWizard = sandbox !== undefined;
  const steps = stepsForMode(MATCHING_STEPS, awaitHiderAnswer);
  const {
    stepId: step,
    stepIndex,
    setStepIndex,
    goNext,
    goBack,
    Stepper,
  } = useToolWizard(steps, {
    wizardStepRef,
    initialStepId: sandbox?.initialWizardStepId,
    syncStep: sandbox ? (sandbox.syncWizardStep ?? false) : true,
  });
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
  const useStickyAnswerFooter = !readOnly && !embeddedWizard;

  const matchingAnswerStepReadout =
    step === "answer" && !nullAnswer && nearestFeatureSummary ? (
      <ResolvedReadout caption={featureCountLabel}>
        {nearestFeatureSummary}
      </ResolvedReadout>
    ) : null;

  const matchingAnswerStepActions =
    step === "answer" ? (
      <>
        {!useStickyAnswerFooter && matchingAnswerStepReadout}
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

  const panelBody = (
    <>
      {step === "category" ? (
        <ToolSection first compact status="active">
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
          {awaitHiderAnswer ? (
            <SendToHidersButton
              costLabel={costLabel}
              isSubmitting={isSubmitting}
              disabled={!canCommit}
              onClick={onCommit}
              instruction="Hiders answer yes or no in game chat once you send this question."
            />
          ) : null}
        </ToolSection>
      ) : null}

      {step === "answer" && !useStickyAnswerFooter ? (
        <ToolSection first compact status="active">
          {matchingAnswerStepActions}
        </ToolSection>
      ) : null}

      {step === "answer" && useStickyAnswerFooter && matchingAnswerStepReadout ? (
        <ToolSection first compact status="active">
          {matchingAnswerStepReadout}
        </ToolSection>
      ) : null}
    </>
  );

  const answerFooter =
    step === "answer" && useStickyAnswerFooter && matchingAnswerStepActions ? (
      <ToolSection first compact status="active">
        {matchingAnswerStepActions}
      </ToolSection>
    ) : undefined;

  const wizardContent = readOnly ? (
    panelBody
  ) : (
    <WizardSwipeSurface
      stepId={step}
      stepIndex={stepIndex}
      canGoBack={stepIndex > 0}
      canGoNext={canSwipeNext}
      onBack={goBack}
      onNext={goNext}
      embedded={embeddedWizard}
    >
      {panelBody}
    </WizardSwipeSurface>
  );

  return (
    <ToolPanelShell
      toolId="matching"
      fillHeight={useStickyAnswerFooter}
      stepper={
        <Stepper
          nav={
            readOnly
              ? undefined
              : {
                  stepIndex,
                  stepCount: steps.length,
                  onBack: goBack,
                  onNext: goNext,
                  canGoNext,
                }
          }
        />
      }
    >
      <div className={readOnly ? "pointer-events-none select-none" : undefined}>
        <WizardToolPanelLayout stickyFooter={answerFooter}>
          {wizardContent}
        </WizardToolPanelLayout>
      </div>

      {error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null}
    </ToolPanelShell>
  );
}
