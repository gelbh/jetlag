import { useState } from "react";
import type { TentaclePoi } from "../../domain/annotations";
import type { DistanceUnit } from "../../domain/distance";
import {
  isTentacleCategoryAvailable,
  TENTACLE_LOCATION_CATEGORIES,
  tentacleQuestionPrompt,
  type TentacleLocationCategoryId,
} from "../../domain/tentacleQuestions";
import { AnchorControls } from "./shared/AnchorControls";
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
} from "./shared/toolStepUtils";

interface TentaclePanelProps {
  categoryId: TentacleLocationCategoryId;
  usedCategoryIds: ReadonlySet<TentacleLocationCategoryId>;
  distanceUnit: DistanceUnit;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  gpsLoading?: boolean;
  error?: string | null;
  onCategoryChange: (categoryId: TentacleLocationCategoryId) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onSelectPoi: (poiId: string) => void;
  onOutOfReachChange: (outOfReach: boolean) => void;
  onCommit: () => void;
}

export function TentaclePanel({
  categoryId,
  usedCategoryIds,
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
}: TentaclePanelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TENTACLE_STEPS[stepIndex]?.id ?? "category";

  const prompt = tentacleQuestionPrompt(categoryId, distanceUnit);
  const categorySelectionAvailable = isTentacleCategoryAvailable(
    categoryId,
    usedCategoryIds,
  );
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;
  const locationsReady = poiOptions.length > 0 || (!loading && hasCenter);
  const canCommit =
    hasCenter &&
    poiOptions.length > 0 &&
    hasRecordedAnswer &&
    categorySelectionAvailable;
  const availableCategories = TENTACLE_LOCATION_CATEGORIES.filter((category) =>
    isTentacleCategoryAvailable(category.id, usedCategoryIds),
  );

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, TENTACLE_STEPS.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const stepper = (
    <ToolStepper
      steps={buildSteps(
        TENTACLE_STEPS,
        deriveStepStates(TENTACLE_STEPS.length, stepIndex),
      )}
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
                onCategoryChange(event.target.value as TentacleLocationCategoryId)
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
        </ToolSection>
      ) : null}

      {step === "locations" ? (
        <ToolSection first compact status="active">
          {loading ? (
            <ResolvedReadout variant="dim">
              Loading locations within 1 mile…
            </ResolvedReadout>
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
        </ToolSection>
      ) : null}

      {step === "answer" ? (
        <>
          <TentacleAnswerPicker
            categoryId={categoryId}
            distanceUnit={distanceUnit}
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
        stepCount={TENTACLE_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "category" && categorySelectionAvailable) ||
          (step === "anchor" && hasCenter) ||
          (step === "locations" && locationsReady && !loading)
        }
      />

      {error ? <p className="text-error">{error}</p> : null}
    </ToolPanelShell>
  );
}
