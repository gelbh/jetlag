import { useState } from "react";
import {
  formatPresetDistance,
  type DistanceUnit,
} from "../../domain/map/distance";
import {
  availableThermometerDistancePresetsForSession,
  isThermometerDistanceOptionAvailableForSession,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
} from "../../domain/questions/thermometerQuestions";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
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
  stepsForMode,
} from "./shared/toolStepUtils";

type PlacementMode = "gps" | "manual";

interface ThermometerPanelProps {
  distanceUnit: DistanceUnit;
  sessionRules: SessionRulesInput;
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
  isSubmitting?: boolean;
  gpsLoading?: boolean;
  error?: string | null;
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
  sessionRules,
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
  isSubmitting = false,
  gpsLoading = false,
  error = null,
}: ThermometerPanelProps) {
  const steps = stepsForMode(THERMOMETER_STEPS, awaitHiderAnswer);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex]?.id ?? "distance";

  const travelTooShort =
    travelMeters !== null && travelMeters + 1 < distanceMeters;
  const availableDistancePresets =
    availableThermometerDistancePresetsForSession(sessionRules);
  const distanceAvailable = isThermometerDistanceOptionAvailableForSession(
    sessionRules,
    distanceMeters,
  );
  const pinsReady = mapStep === "ready";
  const canCommit =
    pinsReady &&
    placementMode === "manual" &&
    (awaitHiderAnswer || answer !== null) &&
    distanceAvailable &&
    !travelTooShort &&
    canSubmitQuestion &&
    !isSubmitting;

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
          <ResolvedReadout variant={walkingActive ? "default" : "dim"}>
            {placementStatus(mapStep, placementMode, walkingActive)}
          </ResolvedReadout>
          {travelMeters !== null ? (
            <ResolvedReadout>
              {placementMode === "gps" ? "Crow-flies: " : "Movement on map: "}
              {formatPresetDistance(travelMeters, distanceUnit)}
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
              disabled={
                !distanceAvailable || !canSubmitQuestion || isSubmitting
              }
              aria-busy={gpsLoading || isSubmitting}
              className="btn-primary w-full disabled:opacity-40"
            >
              {gpsLoading ? "Getting GPS…" : "Start walk"}
            </button>
          ) : null}
          {awaitHiderAnswer &&
          placementMode === "manual" &&
          pinsReady &&
          distanceAvailable &&
          !travelTooShort &&
          canSubmitQuestion ? (
            <>
              <p className="text-xs text-ink-dim">
                Hiders answer hotter or colder in game chat once you send this
                question.
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
          <button type="button" onClick={onReset} className="btn-secondary w-full">
            Reset
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
          {placementMode === "manual" ? (
            <button
              type="button"
              onClick={onCommit}
              disabled={!canCommit}
              aria-busy={isSubmitting}
              className="btn-primary w-full disabled:opacity-40"
            >
              {isSubmitting ? "Sending…" : "Add thermometer"}
            </button>
          ) : null}
        </ToolSection>
      ) : null}

      <ToolWizardNav
        stepIndex={stepIndex}
        stepCount={steps.length}
        onBack={goBack}
        onNext={goNext}
        canGoNext={
          (step === "placement" &&
            (walkingActive || pinsReady || placementMode === "gps")) ||
          (step === "distance" && distanceAvailable)
        }
      />

      {error ? (
        <ResolvedReadout variant="warning">{error}</ResolvedReadout>
      ) : null}
    </ToolPanelShell>
  );
}
