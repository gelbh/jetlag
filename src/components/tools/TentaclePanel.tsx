import { useState } from "react";
import type { TentaclePoi } from "../../domain/annotations";
import type { DistanceUnit } from "../../domain/distance";
import type { GameSize } from "../../domain/gameSize";
import {
  isTentacleCategoryAvailable,
  tentacleCategoriesForGameSize,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "../../domain/tentacleQuestions";
import { AnchorControls } from "./shared/AnchorControls";
import { ErrorWithRetry } from "./shared/ErrorWithRetry";
import { LoadingReadout } from "./shared/LoadingReadout";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { TentacleAnswerPicker } from "./shared/TentacleAnswerPicker";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  TENTACLE_STEPS,
  stepsForMode,
} from "./shared/toolStepUtils";

interface TentaclePanelProps {
  gameSize: GameSize;
  categoryId: TentacleExtendedCategoryId;
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
}

export function TentaclePanel({
  gameSize,
  categoryId,
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
}: TentaclePanelProps) {
  const steps = stepsForMode(TENTACLE_STEPS, awaitHiderAnswer);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex]?.id ?? "category";

  const prompt = tentacleQuestionPrompt(
    categoryId,
    distanceUnit,
    searchRadiusMeters,
  );
  const categorySelectionAvailable = isTentacleCategoryAvailable(
    gameSize,
    categoryId,
  );
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;
  const locationsReady = poiOptions.length > 0 || (!loading && hasCenter);
  const canCommit =
    hasCenter &&
    poiOptions.length > 0 &&
    (awaitHiderAnswer || hasRecordedAnswer) &&
    categorySelectionAvailable &&
    !isSubmitting;
  const availableCategories = tentacleCategoriesForGameSize(gameSize);

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
    <ToolPanelShell toolId="tentacle" stepper={stepper}>
      {step === "category" ? (
        <ToolSection first compact status="active">
          <QuestionPromptBlock
            prompt={prompt}
            ruleSummary="Search radius is fixed at 1 mile from your anchor."
          />
          <label className="field-label">
            Location type
            <select
              value={categoryId}
              onChange={(event) =>
                onCategoryChange(event.target.value as TentacleExtendedCategoryId)
              }
              className="field-input"
            >
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
          {loading && hasCenter ? (
            <LoadingReadout>Loading locations within 1 mile…</LoadingReadout>
          ) : null}
        </ToolSection>
      ) : null}

      {step === "locations" ? (
        <ToolSection first compact status="active">
          {loading ? (
            <LoadingReadout>Loading locations within 1 mile…</LoadingReadout>
          ) : poiOptions.length > 0 ? (
            <ResolvedReadout>
              {poiOptions.length} location{poiOptions.length === 1 ? "" : "s"}{" "}
              found within 1 mile.
            </ResolvedReadout>
          ) : (
            <ResolvedReadout variant="warning">
              No named locations were found within 1 mile.
            </ResolvedReadout>
          )}
          {awaitHiderAnswer && locationsReady && !loading && poiOptions.length > 0 ? (
            <>
              <p className="text-xs text-ink-dim">
                Hiders pick a location or &quot;Not within reach&quot; in game
                chat once you send this question.
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
        canGoNext={
          (step === "category" && categorySelectionAvailable) ||
          (step === "anchor" && hasCenter && !loading && locationsReady) ||
          (step === "locations" && locationsReady && !loading)
        }
      />

      {error ? <ErrorWithRetry error={error} onRetry={onRetry} /> : null}
    </ToolPanelShell>
  );
}
