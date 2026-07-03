import { useState } from "react";
import {
  formatDistance,
  formatPresetDistance,
  type DistanceUnit,
} from "../../domain/distance";
import {
  availableThermometerDistancePresets,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
  type ThermometerDistanceOptionMiles,
} from "../../domain/thermometerQuestions";
import { hotterColderAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { OptionChip, OptionChipRow } from "./shared/OptionChip";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { ToolStepper } from "./shared/ToolStepper";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import {
  buildSteps,
  deriveStepStates,
  THERMOMETER_STEPS,
} from "./shared/toolStepUtils";

interface ThermometerPanelProps {
  distanceUnit: DistanceUnit;
  distanceMeters: number;
  travelMeters: number | null;
  answer: ThermometerAnswer | null;
  step: "a" | "b" | "ready";
  usedDistanceOptions: ReadonlySet<ThermometerDistanceOptionMiles>;
  onDistanceChange: (distanceMeters: number) => void;
  onAnswerChange: (answer: ThermometerAnswer) => void;
  onReset: () => void;
  onCommit: () => void;
}

function placementStatus(step: "a" | "b" | "ready"): string {
  if (step === "a") {
    return "Tap the map for the start of movement.";
  }
  if (step === "b") {
    return "Tap the map for the end of movement.";
  }
  return "Both pins are set.";
}

export function ThermometerPanel({
  distanceUnit,
  distanceMeters,
  travelMeters,
  answer,
  step: mapStep,
  usedDistanceOptions,
  onDistanceChange,
  onAnswerChange,
  onReset,
  onCommit,
}: ThermometerPanelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = THERMOMETER_STEPS[stepIndex]?.id ?? "distance";

  const travelTooShort =
    travelMeters !== null && travelMeters + 1 < distanceMeters;
  const availableDistancePresets =
    availableThermometerDistancePresets(usedDistanceOptions);
  const distanceAvailable = isThermometerDistanceOptionAvailable(
    usedDistanceOptions,
    distanceMeters,
  );
  const pinsReady = mapStep === "ready";
  const canCommit = pinsReady && answer !== null && distanceAvailable;

  const goNext = () => {
    setStepIndex((current) =>
      Math.min(current + 1, THERMOMETER_STEPS.length - 1),
    );
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const stepper = (
    <ToolStepper
      steps={buildSteps(
        THERMOMETER_STEPS,
        deriveStepStates(THERMOMETER_STEPS.length, stepIndex),
      )}
    />
  );

  return (
    <ToolPanelShell toolId="thermometer" stepper={stepper}>
      {step === "distance" ? (
        <ToolSection first compact status="active">
          <QuestionPromptBlock
            prompt={thermometerQuestionPrompt(distanceMeters, distanceUnit)}
          />
          {availableDistancePresets.length === 0 ? (
            <p className="text-sm text-status-warning">
              Every thermometer distance option has already been used this
              session.
            </p>
          ) : (
            <OptionChipRow>
              {availableDistancePresets.map((preset) => (
                <OptionChip
                  key={preset}
                  selected={distanceMeters === preset}
                  onClick={() => onDistanceChange(preset)}
                >
                  {formatPresetDistance(preset, distanceUnit)}
                </OptionChip>
              ))}
            </OptionChipRow>
          )}
        </ToolSection>
      ) : null}

      {step === "placement" ? (
        <ToolSection first compact status="active">
          <ResolvedReadout variant="dim">
            {placementStatus(mapStep)}
          </ResolvedReadout>
          {travelMeters !== null ? (
            <ResolvedReadout>
              Movement on map: {formatDistance(travelMeters, distanceUnit)}
            </ResolvedReadout>
          ) : null}
          {travelTooShort ? (
            <ResolvedReadout variant="warning">
              Movement is shorter than the selected distance. Confirm before
              adding.
            </ResolvedReadout>
          ) : null}
          <button type="button" onClick={onReset} className="btn-secondary w-full">
            Reset pins
          </button>
        </ToolSection>
      ) : null}

      {step === "answer" ? (
        <ToolSection first compact status="active">
          <BinaryAnswerPicker
            value={answer}
            onChange={onAnswerChange}
            options={hotterColderAnswerOptions}
            label=""
          />
          {pinsReady ? (
            <p className="text-xs text-ink-dim">
              The map shows the shaded half for your choice.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit}
            className="btn-primary w-full disabled:opacity-40"
          >
            Add thermometer
          </button>
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={THERMOMETER_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "distance" && distanceAvailable) ||
          (step === "placement" && pinsReady)
        }
      />
    </ToolPanelShell>
  );
}
