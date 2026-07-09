import { useState } from "react";
import { RadarDistancePicker } from "./RadarDistancePicker";
import { yesNoAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { PlacementActions } from "./shared/PlacementActions";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ViewOnlyQuestionBanner } from "./shared/ViewOnlyQuestionBanner";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  RADAR_STEPS,
  stepsForMode,
} from "./shared/toolStepUtils";
import {
  isRadarDistanceOptionAvailable,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../domain/questions/radarQuestions";
import type { DistanceUnit } from "../../domain/map/distance";

interface RadarPanelProps {
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  distanceUnit: DistanceUnit;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  answer: RadarAnswer | null;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
  onAnswerChange: (answer: RadarAnswer) => void;
  onUseGps: () => void;
  onPlaceAtMapTap: () => void;
  onCommit: () => void;
  gpsLoading: boolean;
  error?: string | null;
  awaitHiderAnswer?: boolean;
  costLabel?: string;
  isSubmitting?: boolean;
  viewOnly?: boolean;
}

export function RadarPanel({
  radiusMeters,
  chooseCustom,
  customRadius,
  awaitingPlacement,
  hasCenter,
  distanceUnit,
  usedDistanceOptions,
  answer,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
  onAnswerChange,
  onUseGps,
  onPlaceAtMapTap,
  onCommit,
  gpsLoading,
  error,
  awaitHiderAnswer = false,
  costLabel = "D2P1",
  isSubmitting = false,
  viewOnly = false,
}: RadarPanelProps) {
  const steps = stepsForMode(RADAR_STEPS, awaitHiderAnswer);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex]?.id ?? "anchor";

  const distanceSelectionAvailable =
    radiusMeters !== null && isRadarDistanceOptionAvailable();
  const canCommit =
    hasCenter &&
    distanceSelectionAvailable &&
    (awaitHiderAnswer || answer !== null) &&
    !isSubmitting;
  const canSendToHiders =
    !viewOnly &&
    awaitHiderAnswer &&
    hasCenter &&
    distanceSelectionAvailable &&
    !isSubmitting;
  const canCommitActions = !viewOnly && canCommit;

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
    <ToolPanelShell toolId="radar" stepper={stepper}>
      {viewOnly ? <ViewOnlyQuestionBanner /> : null}
      {step === "distance" ? (
        <ToolSection first compact status="active">
          <p className="text-xs text-ink-dim">
            Radar tests your location at answer time, not your hiding zone.
          </p>
          <RadarDistancePicker
            radiusMeters={radiusMeters ?? 0}
            chooseCustom={chooseCustom}
            customRadius={customRadius}
            distanceUnit={distanceUnit}
            usedDistanceOptions={usedDistanceOptions}
            onPresetSelect={onPresetSelect}
            onChooseSelect={onChooseSelect}
            onCustomRadiusChange={onCustomRadiusChange}
          />
          {awaitHiderAnswer ? (
            <>
              <p className="text-xs text-ink-dim">
                Hiders answer yes or no in game chat once you send this question.
              </p>
              <button
                type="button"
                onClick={onCommit}
                disabled={!canSendToHiders}
                aria-busy={isSubmitting}
                className="btn-primary w-full disabled:opacity-40"
              >
                {isSubmitting ? "Sending…" : `Send to hiders (${costLabel})`}
              </button>
            </>
          ) : null}
        </ToolSection>
      ) : null}

      {step === "anchor" ? (
        <ToolSection first compact status="active">
          <PlacementActions
            awaitingPlacement={awaitingPlacement}
            hasCenter={hasCenter}
            gpsLoading={gpsLoading}
            onUseGps={onUseGps}
            onPlaceAtMapTap={onPlaceAtMapTap}
            centerHint="Center pinned on the map. Tap again to move it."
          />
        </ToolSection>
      ) : null}

      {step === "answer" ? (
        <ToolSection first compact status="active">
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={yesNoAnswerOptions}
            label=""
          />
          {hasCenter && distanceSelectionAvailable ? (
            <p className="text-xs text-ink-dim">
              The map shows the shaded area for your choice.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommitActions}
            aria-busy={isSubmitting}
            className="btn-primary w-full disabled:opacity-40"
          >
            {isSubmitting ? "Sending…" : "Add radar question"}
          </button>
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "anchor" && hasCenter) ||
          (step === "distance" && distanceSelectionAvailable)
        }
      />

      {error ? <p className="text-error">{error}</p> : null}
    </ToolPanelShell>
  );
}
