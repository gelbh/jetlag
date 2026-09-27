/**
 * Thermometer Ask HUD — Matching twin: question header + distance catalog, then map-first.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Crosshair } from "@phosphor-icons/react";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import { AskToolQuestionHeader } from "@/components/tools/ask/AskToolQuestionHeader";
import { HudThermometerIcon } from "@/components/map/icons/ToolIcons";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { ResolvedReadout } from "@/components/tools/shared/readout/ResolvedReadout";
import { QuestionTruthReferenceHint } from "@/components/tools/shared/QuestionTruthReferenceHint";
import { askInsetSurfaceStyle } from "@/components/ui/entry/entryChrome";
import {
  formatPresetDistance,
  type DistanceUnit,
} from "@/domain/map/distance";
import {
  availableThermometerDistancePresetsForSession,
  type ThermometerAnswer,
} from "@/domain/questions";
import type { SessionRulesInput } from "@/domain/session/rules";
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
  step: mapStep,
  placementMode,
  walkingActive,
  presetUseCount,
  costLabel,
  canSubmitQuestion,
  error = null,
  onDistanceChange,
  awaitHiderAnswer = false,
  toolLabel = "Thermometer",
}: ThermometerHudBodyProps) {
  const availableDistancePresets =
    availableThermometerDistancePresetsForSession(sessionRules);
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
        className="pointer-events-auto mx-auto flex max-w-md flex-col gap-1"
        role="status"
        aria-live="polite"
        style={{
          ...askInsetSurfaceStyle,
          borderRadius: 16,
          padding: "0.85rem 1rem",
        }}
      >
        <p
          className="m-0 text-xs font-bold uppercase tracking-[0.1em]"
          style={{ color: "var(--color-flag)" }}
        >
          Walking
        </p>
        <p
          className="m-0 font-display text-xl font-bold leading-[1.15] tracking-wide tabular-nums"
          style={{ color: "var(--color-field-ink)" }}
        >
          {walkedLabel}
          <span
            className="font-medium"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            {" "}
            /{" "}
          </span>
          {targetLabel}
        </p>
        <p className="mt-1 text-xs text-field-ink-muted">
          Line updates live for hiders. End walk on the strip when ready.
        </p>
      </div>
    ) : null;

  return (
    <div
      data-testid="thermometer-hud-body"
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
