import { useState } from "react";
import { RadarDistancePicker } from "./RadarDistancePicker";
import { yesNoAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { PlacementActions } from "./shared/PlacementActions";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  RADAR_STEPS,
} from "./shared/toolStepUtils";
import {
  isRadarDistanceOptionAvailable,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../domain/radarQuestions";
import type { DistanceUnit } from "../../domain/distance";

interface RadarPanelProps {
  radiusMeters: number;
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
}: RadarPanelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = RADAR_STEPS[stepIndex]?.id ?? "distance";

  const distanceSelectionAvailable = isRadarDistanceOptionAvailable(
    usedDistanceOptions,
    chooseCustom,
    radiusMeters,
  );
  const canCommit = hasCenter && answer !== null && distanceSelectionAvailable;

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, RADAR_STEPS.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const stepper = (
    <ToolStepper
      steps={buildSteps(
        RADAR_STEPS,
        deriveStepStates(RADAR_STEPS.length, stepIndex),
      )}
    />
  );

  return (
    <ToolPanelShell toolId="radar" stepper={stepper}>
      {step === "distance" ? (
        <RadarDistancePicker
          radiusMeters={radiusMeters}
          chooseCustom={chooseCustom}
          customRadius={customRadius}
          distanceUnit={distanceUnit}
          usedDistanceOptions={usedDistanceOptions}
          onPresetSelect={onPresetSelect}
          onChooseSelect={onChooseSelect}
          onCustomRadiusChange={onCustomRadiusChange}
        />
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
            disabled={!canCommit}
            className="btn-primary w-full disabled:opacity-40"
          >
            Add radar question
          </button>
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={RADAR_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "distance" && distanceSelectionAvailable) ||
          (step === "anchor" && hasCenter)
        }
      />

      {error ? <p className="text-error">{error}</p> : null}
    </ToolPanelShell>
  );
}
