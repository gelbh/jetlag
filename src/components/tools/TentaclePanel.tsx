import { type RefObject } from "react";
import type { TentaclePoi } from "../../domain/map/annotations";
import { formatPresetDistance, type DistanceUnit } from "../../domain/map/distance";
import type { GameSize } from "../../domain/session/gameSize";
import {
  isTentacleCategoryAvailable,
  tentacleCategoriesForGameSize,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "../../domain/questions";
import { AnchorControls } from "./shared/AnchorControls";
import { ErrorWithRetry } from "./shared/ErrorWithRetry";
import { LoadingReadout } from "./shared/LoadingReadout";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { TentacleAnswerPicker } from "./shared/TentacleAnswerPicker";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { SendToHidersButton } from "./shared/SendToHidersButton";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { TENTACLE_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/toolWizardGuards";
import { useToolWizard } from "../../hooks/useToolWizard";

interface TentaclePanelProps {
  gameSize: GameSize;
  categoryId: TentacleExtendedCategoryId | null;
  categoryChosen: boolean;
  searchRadiusMeters: number;
  usedCategoryIds: ReadonlySet<TentacleExtendedCategoryId>;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading?: boolean;
  error?: string | null;
  onCategoryChange: (categoryId: TentacleExtendedCategoryId) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
  onCommit: () => void;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  onRetry?: () => void;
  wizardStepRef?: RefObject<string>;
}

export function TentaclePanel({
  gameSize,
  categoryId,
  categoryChosen,
  searchRadiusMeters,
  distanceUnit,
  poiOptions,
  selectedPoiId,
  outOfReach,
  loading,
  awaitingPlacement,
  hasCenter,
  gpsLoading = false,
  error,
  onCategoryChange,
  onUseGps,
  onPlaceAtMapTap,
  onSelectPoi,
  onOutOfReachChange,
  onCommit,
  awaitHiderAnswer = false,
  costLabel = "D4P2",
  isSubmitting = false,
  onRetry,
  wizardStepRef,
}: TentaclePanelProps) {
  const steps = stepsForMode(TENTACLE_STEPS, awaitHiderAnswer);
  const { stepId: step, stepIndex, goNext, goBack, stepper } = useToolWizard(
    steps,
    { wizardStepRef },
  );

  const prompt =
    categoryId !== null
      ? tentacleQuestionPrompt(categoryId, distanceUnit, searchRadiusMeters)
      : "Choose a category to build your tentacle question.";
  const searchRadiusLabel =
    categoryId !== null
      ? formatPresetDistance(searchRadiusMeters, distanceUnit)
      : null;
  const categorySelectionAvailable =
    categoryId !== null && isTentacleCategoryAvailable(gameSize, categoryId);
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;
  const locationsReady = poiOptions.length > 0 || (!loading && hasCenter);
  const canCommit =
    categoryChosen &&
    categoryId !== null &&
    hasCenter &&
    poiOptions.length > 0 &&
    (awaitHiderAnswer || hasRecordedAnswer) &&
    categorySelectionAvailable &&
    !isSubmitting;
  const availableCategories = tentacleCategoriesForGameSize(gameSize);

  const canGoNext =
    (step === "anchor" && hasCenter && !loading) ||
    (step === "category" && categorySelectionAvailable) ||
    (step === "locations" && locationsReady && !loading);
  const canSwipeNext = toolWizardSwipeNext(canGoNext, stepIndex, steps.length);

  return (
    <ToolPanelShell toolId="tentacle" stepper={stepper}>
      <WizardSwipeSurface
        stepId={step}
        stepIndex={stepIndex}
        canGoBack={stepIndex > 0}
        canGoNext={canSwipeNext}
        onBack={goBack}
        onNext={goNext}
      >
      {step === "category" ? (
        <ToolSection first compact status="active">
          <QuestionPromptBlock
            prompt={prompt}
            ruleSummary={
              searchRadiusLabel
                ? `Search radius is fixed at ${searchRadiusLabel} from your anchor.`
                : undefined
            }
          />
          <label className="field-label">
            Location type
            <select
              value={categoryChosen && categoryId ? categoryId : ""}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                onCategoryChange(event.target.value as TentacleExtendedCategoryId);
              }}
              className="field-input"
            >
              <option value="">Choose a category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </ToolSection>
      ) : null}

      {step === "anchor" ? (
        <ToolSection first compact status="active">
          <AnchorControls
            awaitingPlacement={awaitingPlacement}
            hasAnchor={hasCenter}
            gpsLoading={gpsLoading}
            onUseGps={onUseGps}
            onPlaceAtMapTap={onPlaceAtMapTap}
            anchorHint="Anchor pinned on the map. Tap again to move it."
            gpsLoadingLabel="Locating…"
          />
          {loading && hasCenter && categoryChosen ? (
            <LoadingReadout>
              Loading locations within {searchRadiusLabel}…
            </LoadingReadout>
          ) : null}
        </ToolSection>
      ) : null}

      {step === "locations" ? (
        <ToolSection first compact status="active">
          {loading ? (
            <LoadingReadout>
              Loading locations within {searchRadiusLabel}…
            </LoadingReadout>
          ) : poiOptions.length > 0 ? (
            <ResolvedReadout>
              {poiOptions.length} location{poiOptions.length === 1 ? "" : "s"}{" "}
              found within {searchRadiusLabel}.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="warning">
              No named locations were found within {searchRadiusLabel}.
            </ResolvedReadout>
          )}
          {awaitHiderAnswer && locationsReady && !loading && poiOptions.length > 0 ? (
            <SendToHidersButton
              costLabel={costLabel}
              isSubmitting={isSubmitting}
              disabled={!canCommit}
              onClick={onCommit}
              instruction='Hiders pick a location or "Not within reach" in game chat once you send this question.'
            />
          ) : null}
        </ToolSection>
      ) : null}

      {step === "answer" && categoryId ? (
        <>
          <TentacleAnswerPicker
            categoryId={categoryId}
            distanceUnit={distanceUnit}
            searchRadiusMeters={searchRadiusMeters}
            poiOptions={poiOptions}
            selectedPoiId={selectedPoiId}
            outOfReach={outOfReach}
            onSelectPoi={onSelectPoi}
            onOutOfReachChange={onOutOfReachChange}
          />
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit}
            className="btn-primary w-full disabled:opacity-40"
          >
            Add tentacle question
          </button>
        </>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={canGoNext}
      />
      </WizardSwipeSurface>

      {error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null}
    </ToolPanelShell>
  );
}
