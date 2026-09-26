/**
 * Thermometer Ask HUD — Matching twin: question header + distance catalog, then map-first.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Crosshair } from "@phosphor-icons/react";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { AskToolQuestionHeader } from "@/components/tools/ask/AskToolQuestionHeader";
import { HudThermometerIcon } from "@/components/map/icons/ToolIcons";
import { hotterColderAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { BinaryAnswerPicker } from "@/components/tools/shared/answers/BinaryAnswerPicker";
import { OptionChip, OptionChipRow } from "@/components/tools/shared/controls/OptionChip";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { iosAskInsetSurfaceStyle } from "@/components/ui/apple/iosEntryChrome";
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
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

type PlacementMode = "gps" | "manual";

const THERMO_QUESTION_INTRO = {
  prompt: "After traveling [distance], am I hotter or colder?",
  ruleSummary:
    "Pick a walk distance. On the map, start a GPS track or place start and end pins.",
};

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
  toolLabel?: string;
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
  toolLabel = "Thermometer",
}: ThermometerHudBodyProps) {
  const mantinePlayerUi = usePlayerUiMantine();
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

  const distanceRows = availableDistancePresets.map((preset) => ({
    id: String(preset),
    label:
      presetUseCount > 0 && preset === distanceMeters
        ? `${formatPresetDistance(preset, distanceUnit)} · ${costLabel}`
        : formatPresetDistance(preset, distanceUnit),
    icon: (
      <Crosshair
        size={20}
        weight="duotone"
        color="currentColor"
        aria-hidden
      />
    ),
  }));

  const walkBanner =
    chord === "walking" ? (
      <div
        data-testid="ask-walk-banner"
        className="ask-walk-banner pointer-events-auto"
        role="status"
        aria-live="polite"
        {...(mantinePlayerUi ? { "data-player-ux-world": "mantine" } : {})}
        style={
          mantinePlayerUi
            ? {
                ...iosAskInsetSurfaceStyle,
                borderRadius: 16,
                padding: "0.85rem 1rem",
              }
            : undefined
        }
      >
        <p className="ask-walk-banner__label text-xs">Walking</p>
        <p className="ask-walk-banner__progress font-display text-xl">
          {walkedLabel}
          <span className="ask-walk-banner__sep"> / </span>
          {targetLabel}
        </p>
        <p className="ask-walk-banner__hint text-xs text-field-ink-muted">
          Line updates live for hiders. End walk on the strip when ready.
        </p>
      </div>
    ) : null;

  if (mantinePlayerUi) {
    return (
      <div
        data-testid="thermometer-hud-body"
        data-player-ux-world="mantine"
        className="ask-hud-mode-body flex w-full flex-col gap-2"
      >
        {walkBanner}

        {chord === "setup" ? (
          <div className="flex w-full flex-col gap-2">
            <AskToolQuestionHeader
              toolLabel={toolLabel}
              costLabel={costLabel}
              icon={<HudThermometerIcon width={22} height={22} />}
              prompt={THERMO_QUESTION_INTRO.prompt}
              ruleSummary={THERMO_QUESTION_INTRO.ruleSummary}
            />

            {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}

            <AskCatalogRail
              rows={distanceRows}
              selectedId={null}
              onSelect={(id) => onDistanceChange(Number(id))}
              aria-label="Thermometer distance"
              hint="Tap a walk distance"
              columns={availableDistancePresets.length <= 3 ? 3 : 4}
            />

            {!canSubmitQuestion ? (
              <ResolvedReadout variant="warning">
                Finish the open question before starting another.
              </ResolvedReadout>
            ) : null}
            {error ? <AskInlineError message={error} /> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid="thermometer-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      {walkBanner}

      {chord === "setup" ? (
        <div className="pointer-events-auto ask-hud-panel space-y-3 p-3">
          {awaitHiderAnswer ? <QuestionTruthReferenceHint /> : null}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-ink-muted">
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-field-ink-muted">
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
          {error ? <AskInlineError message={error} /> : null}
        </div>
      ) : null}

      {chord === "answer" ? (
        <div className="pointer-events-auto ask-hud-panel space-y-2 p-3">
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
          {error ? <AskInlineError message={error} /> : null}
        </div>
      ) : null}
    </div>
  );
}
