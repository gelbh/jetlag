import { type RefObject } from "react";
import { RadarDistancePicker } from "./RadarDistancePicker";
import { yesNoAnswerOptions } from "./shared/binaryAnswerOptions";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { PlacementActions } from "./shared/PlacementActions";
import { ToolPanelShell } from "./shared/ToolPanelShell";
import { ViewOnlyQuestionBanner } from "./shared/ViewOnlyQuestionBanner";
import { ToolSection } from "./shared/ToolSection";
import { SendToHidersButton } from "./shared/SendToHidersButton";
import { InlineError } from "../ui/InlineError";
import { ToolWizardNav } from "./shared/ToolWizardNav";
import { WizardSwipeSurface } from "./shared/WizardSwipeSurface";
import { RADAR_STEPS, stepsForMode } from "./shared/toolStepUtils";
import { toolWizardSwipeNext } from "./shared/toolWizardGuards";
import { useToolWizard } from "../../hooks/useToolWizard";
import { parseDistanceInput, type DistanceUnit } from "../../domain/map/distance";
import {
  isRadarRadiusAllowedForGameSize,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../domain/questions";
import type { GameSize } from "../../domain/session/gameSize";

interface RadarPanelProps {
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
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
  wizardStepRef?: RefObject<string>;
}

export function RadarPanel({
  radiusMeters,
  chooseCustom,
  customRadius,
  awaitingPlacement,
  hasCenter,
  distanceUnit,
  gameSize,
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
  wizardStepRef,
}: RadarPanelProps) {
  const steps = stepsForMode(RADAR_STEPS, awaitHiderAnswer);
  const { stepId: step, stepIndex, goNext, goBack, stepper } = useToolWizard(
    steps,
    { wizardStepRef },
  );

  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;
  const distanceSelectionAvailable =
    resolvedRadius !== null &&
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadius,
      distanceUnit,
      chooseCustom,
    );
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

  const canGoNext =
    (step === "anchor" && hasCenter) ||
    (step === "distance" && distanceSelectionAvailable);
  const canSwipeNext = toolWizardSwipeNext(canGoNext, stepIndex, steps.length);

  return (
    <ToolPanelShell toolId="radar" stepper={stepper}>
      <WizardSwipeSurface
        stepId={step}
        stepIndex={stepIndex}
        canGoBack={stepIndex > 0}
        canGoNext={canSwipeNext}
        onBack={goBack}
        onNext={goNext}
      >
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
            gameSize={gameSize}
            usedDistanceOptions={usedDistanceOptions}
            onPresetSelect={onPresetSelect}
            onChooseSelect={onChooseSelect}
            onCustomRadiusChange={onCustomRadiusChange}
          />
          {awaitHiderAnswer ? (
            <SendToHidersButton
              costLabel={costLabel}
              isSubmitting={isSubmitting}
              disabled={!canSendToHiders}
              onClick={onCommit}
              instruction="Hiders answer yes or no in game chat once you send this question."
            />
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
        canGoNext={canGoNext}
      />
      </WizardSwipeSurface>

      {error ? <InlineError>{error}</InlineError> : null}
    </ToolPanelShell>
  );
}
