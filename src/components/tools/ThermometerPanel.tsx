import { useState } from "react";
import {
  formatDistance,
  formatPresetDistance,
  type DistanceUnit,
} from "../../domain/distance";
import type { GameSize } from "../../domain/gameSize";
import {
  availableThermometerDistancePresets,
  isThermometerDistanceOptionAvailable,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
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

type PlacementMode = "gps" | "manual";

interface ThermometerPanelProps {
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  distanceMeters: number;
  travelMeters: number | null;
  answer: ThermometerAnswer | null;
  step: "a" | "b" | "ready";
  presetUseCount: number;
  costLabel: string;
  placementMode: PlacementMode;
  walkingActive: boolean;
  onPlacementModeChange: (mode: PlacementMode) => void;
  onDistanceChange: (distanceMeters: number) => void;
  onAnswerChange: (answer: ThermometerAnswer) => void;
  onReset: () => void;
  onStartWalk: () => void;
  onCommit: () => void;
  awaitHiderAnswer?: boolean;
  canSubmitQuestion?: boolean;
}

function placementStatus(
  step: "a" | "b" | "ready",
  placementMode: PlacementMode,
  walkingActive: boolean,
): string {
  if (walkingActive) {
    return "Walking — line updates live for hiders.";
  }

  if (placementMode === "gps") {
    return "GPS walk sets start automatically when you begin.";
  }

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
  gameSize,
  distanceMeters,
  travelMeters,
  answer,
  step: mapStep,
  presetUseCount,
  costLabel,
  placementMode,
  walkingActive,
  onPlacementModeChange,
  onDistanceChange,
  onAnswerChange,
  onReset,
  onStartWalk,
  onCommit,
  awaitHiderAnswer = false,
  canSubmitQuestion = true,
}: ThermometerPanelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = THERMOMETER_STEPS[stepIndex]?.id ?? "distance";

  const travelTooShort =
    travelMeters !== null && travelMeters + 1 < distanceMeters;
  const availableDistancePresets = availableThermometerDistancePresets(gameSize);
  const distanceAvailable = isThermometerDistanceOptionAvailable(
    gameSize,
    distanceMeters,
  );
  const pinsReady = mapStep === "ready";
  const canCommit =
    pinsReady &&
    placementMode === "manual" &&
    (awaitHiderAnswer || answer !== null) &&
    distanceAvailable &&
    !travelTooShort &&
    canSubmitQuestion;

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
          <OptionChipRow>
            {availableDistancePresets.map((preset) => {
              const reuse =
                presetUseCount > 0 && preset === distanceMeters
                  ? costLabel
                  : null;
              return (
                <OptionChip
                  key={preset}
                  selected={distanceMeters === preset}
                  onClick={() => onDistanceChange(preset)}
                >
                  {formatPresetDistance(preset, distanceUnit)}
                  {reuse ? ` · ${reuse}` : ""}
                </OptionChip>
              );
            })}
          </OptionChipRow>
          <OptionChipRow>
            <OptionChip
              selected={placementMode === "gps"}
              onClick={() => onPlacementModeChange("gps")}
            >
              GPS walk
            </OptionChip>
            <OptionChip
              selected={placementMode === "manual"}
              onClick={() => onPlacementModeChange("manual")}
            >
              Manual pins
            </OptionChip>
          </OptionChipRow>
        </ToolSection>
      ) : null}

      {step === "placement" ? (
        <ToolSection first compact status="active">
          <ResolvedReadout variant="dim">
            {placementStatus(mapStep, placementMode, walkingActive)}
          </ResolvedReadout>
          {travelMeters !== null ? (
            <ResolvedReadout>
              {placementMode === "gps" ? "Crow-flies: " : "Movement on map: "}
              {formatDistance(travelMeters, distanceUnit)}
            </ResolvedReadout>
          ) : null}
          {travelTooShort ? (
            <ResolvedReadout variant="warning">
              Movement is shorter than the selected distance.
            </ResolvedReadout>
          ) : null}
          {!canSubmitQuestion ? (
            <ResolvedReadout variant="warning">
              Finish the open question before starting another.
            </ResolvedReadout>
          ) : null}
          {placementMode === "gps" && !walkingActive ? (
            <button
              type="button"
              onClick={onStartWalk}
              disabled={!distanceAvailable || !canSubmitQuestion}
              className="btn-primary w-full disabled:opacity-40"
            >
              Start walk
            </button>
          ) : null}
          <button type="button" onClick={onReset} className="btn-secondary w-full">
            Reset
          </button>
        </ToolSection>
      ) : null}

      {step === "answer" ? (
        <ToolSection first compact status="active">
          {awaitHiderAnswer ? (
            <p className="text-sm text-ink-muted">
              Hiders answer hotter or colder in game chat once the walk ends.
            </p>
          ) : (
            <BinaryAnswerPicker
              value={answer}
              onChange={onAnswerChange}
              options={hotterColderAnswerOptions}
              label=""
            />
          )}
          {placementMode === "manual" ? (
            <button
              type="button"
              onClick={onCommit}
              disabled={!canCommit}
              className="btn-primary w-full disabled:opacity-40"
            >
              {awaitHiderAnswer ? "Send to hiders" : "Add thermometer"}
            </button>
          ) : null}
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={THERMOMETER_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "distance" && distanceAvailable) ||
          (step === "placement" &&
            (walkingActive || pinsReady || placementMode === "gps"))
        }
      />
    </ToolPanelShell>
  );
}
