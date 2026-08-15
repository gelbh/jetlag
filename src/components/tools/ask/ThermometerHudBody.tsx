/**
 * Thermometer Ask HUD mode body — walk banner owns status; strip owns exit.
 * No PhaseRail / CONTINUE / duplicate END WALK in the body.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { hotterColderAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { OptionChip, OptionChipRow } from "@/components/tools/shared/controls/OptionChip";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import {
  formatPresetDistance,
  type DistanceUnit,
} from "@/domain/map/distance";
import {
  availableThermometerDistancePresetsForSession,
  isThermometerDistanceOptionAvailableForSession,
  thermometerQuestionPrompt,
  type ThermometerAnswer,
} from "@/domain/questions";
import type { SessionRulesInput } from "@/domain/session/rules";

type PlacementMode = "gps" | "manual";

export type ThermometerHudBodyProps = {
  distanceUnit: DistanceUnit;
  sessionRules: SessionRulesInput;
  distanceMeters: number;
  travelMeters: number | null;
  answer: ThermometerAnswer | null;
  step: "a" | "b" | "ready";
  placementMode: PlacementMode;
  walkingActive: boolean;
  presetUseCount: number;
  costLabel: string;
  gpsLoading: boolean;
  canSubmitQuestion: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onPlacementModeChange: (mode: PlacementMode) => void;
  onDistanceChange: (distanceMeters: number) => void;
  onAnswerChange: (answer: ThermometerAnswer) => void;
  onReset: () => void;
  onStartWalk: () => void;
  awaitHiderAnswer?: boolean;
};

export function ThermometerHudBody({
  distanceUnit,
  sessionRules,
  distanceMeters,
  travelMeters,
  answer,
  step: mapStep,
  placementMode,
  walkingActive,
  presetUseCount,
  costLabel,
  gpsLoading,
  canSubmitQuestion,
  isSubmitting,
  error = null,
  onPlacementModeChange,
  onDistanceChange,
  onAnswerChange,
  onReset,
  onStartWalk,
  awaitHiderAnswer = false,
}: ThermometerHudBodyProps) {
  const availableDistancePresets =
    availableThermometerDistancePresetsForSession(sessionRules);
  const distanceAvailable = isThermometerDistanceOptionAvailableForSession(
    sessionRules,
    distanceMeters,
  );
  const travelTooShort =
    travelMeters !== null && travelMeters + 1 < distanceMeters;
  const pinsReady = mapStep === "ready";

  let chord: "setup" | "walking" | "answer" = "setup";
  if (walkingActive) {
    chord = "walking";
  } else if (pinsReady && placementMode === "manual") {
    chord = "answer";
  } else if (pinsReady && placementMode === "gps" && !awaitHiderAnswer) {
    // Local GPS walk finished → answer before ASK strip.
    chord = "answer";
  }

  const walkedLabel =
    travelMeters !== null
      ? formatPresetDistance(travelMeters, distanceUnit)
      : formatPresetDistance(0, distanceUnit);
  const targetLabel = formatPresetDistance(distanceMeters, distanceUnit);

  const placementStatus = ((): string => {
    if (placementMode === "gps") {
      return "GPS track sets start automatically when you begin.";
    }
    if (mapStep === "a") {
      return "Tap the map for the start of movement.";
    }
    if (mapStep === "b") {
      return "Tap the map for the end of movement.";
    }
    return "Both pins are set.";
  })();

  return (
    <div
      data-testid="thermometer-hud-body"
      className="ask-hud-mode-body mx-auto flex max-w-xl flex-col gap-2"
    >
      {chord === "walking" ? (
        <div
          data-testid="ask-walk-banner"
          className="ask-walk-banner pointer-events-auto"
          role="status"
          aria-live="polite"
        >
          <p className="ask-walk-banner__label text-xs">Walking</p>
          <p className="ask-walk-banner__progress font-display text-xl">
            {walkedLabel}
            <span className="ask-walk-banner__sep"> / </span>
            {targetLabel}
          </p>
          <p className="ask-walk-banner__hint text-xs text-ink-muted">
            Line updates live for hiders. End walk on the strip when ready.
          </p>
        </div>
      ) : null}

      {chord === "setup" ? (
        <div className="pointer-events-auto hud-panel space-y-3 p-3">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
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
          <ResolvedReadout variant="dim">{placementStatus}</ResolvedReadout>
          <QuestionPromptBlock
            prompt={thermometerQuestionPrompt(distanceMeters, distanceUnit)}
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Distance
            </p>
            <AskChipIsland
              chips={availableDistancePresets.map((preset) => ({
                id: String(preset),
                label:
                  presetUseCount > 0 && preset === distanceMeters
                    ? `${formatPresetDistance(preset, distanceUnit)} · ${costLabel}`
                    : formatPresetDistance(preset, distanceUnit),
              }))}
              selectedId={String(distanceMeters)}
              onSelect={(id) => onDistanceChange(Number(id))}
              aria-label="Thermometer distance"
            />
          </div>
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
          {placementMode === "gps" ? (
            <button
              type="button"
              onClick={onStartWalk}
              disabled={
                !distanceAvailable || !canSubmitQuestion || isSubmitting
              }
              aria-busy={gpsLoading || isSubmitting}
              className="btn-secondary w-full disabled:opacity-40"
            >
              {gpsLoading ? "Getting GPS…" : "Start track"}
            </button>
          ) : null}
          <button type="button" onClick={onReset} className="btn-secondary w-full">
            Reset
          </button>
          {error ? (
            <ResolvedReadout variant="warning">{error}</ResolvedReadout>
          ) : null}
        </div>
      ) : null}

      {chord === "answer" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          {travelMeters !== null ? (
            <ResolvedReadout>
              Movement: {formatPresetDistance(travelMeters, distanceUnit)}
            </ResolvedReadout>
          ) : null}
          {travelTooShort ? (
            <ResolvedReadout variant="warning">
              Movement is shorter than the selected distance.
            </ResolvedReadout>
          ) : null}
          {!awaitHiderAnswer ? (
            <BinaryAnswerPicker
              value={answer}
              onChange={onAnswerChange}
              options={hotterColderAnswerOptions}
              label=""
            />
          ) : (
            <ResolvedReadout variant="dim">
              Hiders answer hotter or colder in game chat once you send.
            </ResolvedReadout>
          )}
          {error ? (
            <ResolvedReadout variant="warning">{error}</ResolvedReadout>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
