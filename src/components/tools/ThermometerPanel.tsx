import { type RefObject } from "react";
import {
  formatPresetDistance,
  type DistanceUnit,
} from "../../domain/map/distance";
import {
  availableThermometerDistancePresetsForSession,
  isThermometerDistanceOptionAvailableForSession,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
} from "../../domain/questions";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { hotterColderAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { OptionChip, OptionChipRow } from "./shared/OptionChip";
import { QuestionPromptBlock } from "./shared/QuestionPromptBlock";
import { ResolvedReadout } from "./shared/ResolvedReadout";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ToolSection } from "./shared/ToolSection";
import { SendToHidersButton } from "./shared/SendToHidersButton";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { WizardToolPanelLayout } from "./shared/WizardToolPanelLayout";
import { THERMOMETER_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/toolWizardGuards";
import { useToolWizard } from "../../hooks/useToolWizard";
import type { ToolPanelSandboxMode } from "./shared/toolPanelSandbox";

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
  wizardStepRef?: RefObject<string>;
  sandbox?: ToolPanelSandboxMode;
}

function placementStatus(
  step: "a" | "b" | "ready",
  placementMode: PlacementMode,
  walkingActive: boolean,
): string {
  if (walkingActive) {
    return "Moving. Line updates live for hiders.";
  }

  if (placementMode === "gps") {
    return "GPS track sets start automatically when you begin.";
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
  wizardStepRef,
  sandbox,
}: ThermometerPanelProps) {
  const readOnly = sandbox?.readOnly ?? false;
  const embeddedWizard = sandbox !== undefined;
  const steps = stepsForMode(THERMOMETER_STEPS, awaitHiderAnswer);
  const { stepId: step, stepIndex, goNext, goBack, Stepper } = useToolWizard(
    steps,
    {
      wizardStepRef,
      initialStepId: sandbox?.initialWizardStepId,
      syncStep: sandbox ? (sandbox.syncWizardStep ?? false) : true,
    },
  );

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

  const canGoNext =
    (step === "placement" &&
      (walkingActive || pinsReady || placementMode === "gps")) ||
    (step === "distance" && distanceAvailable);
  const canSwipeNext =
    !readOnly && toolWizardSwipeNext(canGoNext, stepIndex, steps.length);
  const useStickyAnswerFooter = !readOnly && !embeddedWizard;

  const thermometerAnswerStepActions =
    step === "answer" ? (
      <>
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
      </>
    ) : null;

  const panelBody = (
    <>
      {step === "distance" ? (
        <ToolSection first compact status="active">
          <QuestionPromptBlock
            prompt={thermometerQuestionPrompt(distanceMeters, distanceUnit)}
          />
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Distance
              </p>
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
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Movement mode
              </p>
              <OptionChipRow>
                <OptionChip
                  selected={placementMode === "gps"}
                  onClick={() => onPlacementModeChange("gps")}
                >
                  GPS track
                </OptionChip>
                <OptionChip
                  selected={placementMode === "manual"}
                  onClick={() => onPlacementModeChange("manual")}
                >
                  Manual pins
                </OptionChip>
              </OptionChipRow>
            </div>
          </div>
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
              {gpsLoading ? "Getting GPS…" : "Start track"}
            </button>
          ) : null}
          {awaitHiderAnswer &&
          placementMode === "manual" &&
          pinsReady &&
          distanceAvailable &&
          !travelTooShort &&
          canSubmitQuestion ? (
            <SendToHidersButton
              costLabel={costLabel}
              isSubmitting={isSubmitting}
              disabled={!canCommit}
              onClick={onCommit}
              instruction="Hiders answer hotter or colder in game chat once you send this question."
            />
          ) : null}
          <button type="button" onClick={onReset} className="btn-secondary w-full">
            Reset
          </button>
        </ToolSection>
      ) : null}

      {step === "answer" && !useStickyAnswerFooter ? (
        <ToolSection first compact status="active">
          {thermometerAnswerStepActions}
        </ToolSection>
      ) : null}
    </>
  );

  const answerFooter =
    step === "answer" && useStickyAnswerFooter && thermometerAnswerStepActions ? (
      <ToolSection first compact status="active">
        {thermometerAnswerStepActions}
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
      toolId="thermometer"
      fillHeight={useStickyAnswerFooter}
      stepper={
        sandbox?.hideStepper ? undefined : (
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
        )
      }
    >
      <div className={readOnly ? "pointer-events-none select-none" : undefined}>
        <WizardToolPanelLayout stickyFooter={answerFooter}>
          {wizardContent}
        </WizardToolPanelLayout>
      </div>

      {error ? (
        <ResolvedReadout variant="warning">{error}</ResolvedReadout>
      ) : null}
    </ToolPanelShell>
  );
}
