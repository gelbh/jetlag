/**
 * Map-first Thermometer chrome: mode + place/start, then hotter/colder + Send.
 * Distance catalog stays on the sheet; live walk banner stays on the sheet.
 */
import { Button, UnstyledButton } from "@mantine/core";
import {
  Flame,
  GpsFix,
  PaperPlaneTilt,
  Path,
  Snowflake,
} from "@phosphor-icons/react";
import { HudThermometerIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
  type AskMapPlacementPhase,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { hotterColderAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  askInsetSurfaceStyle,
  choiceChipStyles,
  filledStyles,
  mapChromeSurfaceStyles,
} from "@/components/ui/entry/entryChrome";
import type { ThermometerAnswer } from "@/domain/questions";

type PlacementMode = "gps" | "manual";

export type ThermometerMapPlacementChromeProps = {
  distanceLabel: string;
  questionPrompt: string;
  costLabel?: string;
  pinStep: "a" | "b" | "ready";
  placementMode: PlacementMode;
  onPlacementModeChange: (mode: PlacementMode) => void;
  onStartWalk: () => void;
  gpsLoading?: boolean;
  canStartWalk?: boolean;
  travelLabel?: string | null;
  travelTooShort?: boolean;
  awaitHiderAnswer?: boolean;
  answer?: ThermometerAnswer | null;
  onAnswerChange?: (answer: ThermometerAnswer) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeSetup?: () => void;
};

const answerSegmentStyles = (
  selected: boolean,
  tone: "success" | "danger",
) => {
  const base = choiceChipStyles(selected, tone);
  return {
    root: {
      ...base.root,
      flex: 1,
      minHeight: "2.75rem",
      height: "2.75rem",
      borderRadius: 10,
      paddingInline: "0.7rem",
      fontSize: "0.9375rem",
      fontWeight: 650,
      letterSpacing: "-0.02em",
      justifyContent: "center",
      gap: 6,
      boxShadow: "none",
      transition:
        "background-color 160ms ease, color 160ms ease, transform 120ms ease",
      ...(selected
        ? null
        : {
            backgroundColor: "transparent",
            border: "none",
            color: "var(--color-field-ink-muted)",
            "&:hover:not(:disabled)": {
              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
              color: "var(--color-field-ink)",
            },
          }),
      "&:active:not(:disabled)": {
        transform: "scale(0.98)",
      },
    },
  };
};

export function ThermometerMapPlacementChrome({
  distanceLabel,
  questionPrompt,
  costLabel,
  pinStep,
  placementMode,
  onPlacementModeChange,
  onStartWalk,
  gpsLoading = false,
  canStartWalk = false,
  travelLabel = null,
  travelTooShort = false,
  awaitHiderAnswer = false,
  answer = null,
  onAnswerChange,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeSetup,
}: ThermometerMapPlacementChromeProps) {
  const pinsReady = pinStep === "ready";
  const phase: AskMapPlacementPhase = "answer";
  const showSoloAnswers =
    pinsReady && !awaitHiderAnswer && Boolean(onAnswerChange);

  const placeHint =
    placementMode === "manual" && pinStep === "a"
      ? "Tap the map for the start of movement."
      : placementMode === "manual" && pinStep === "b"
        ? "Tap the map for the end of movement."
        : placementMode === "gps" && !pinsReady
          ? "Start a GPS track, or switch to manual pins."
          : null;

  const answerSlot = (
    <div
      data-testid="thermometer-map-placement-answer"
      className="mx-auto flex w-full max-w-[22rem] flex-col gap-2"
    >
      <div
        className="flex flex-col gap-2"
        style={{
          ...mapChromeSurfaceStyles,
          borderRadius: 16,
          padding: "0.55rem",
          color: "var(--color-field-ink)",
        }}
      >
        {!pinsReady ? (
          <div
            className="flex gap-1"
            role="group"
            aria-label="Movement mode"
            style={{
              ...askInsetSurfaceStyle,
              borderRadius: 14,
              padding: 4,
            }}
          >
            {(
              [
                {
                  id: "gps" as const,
                  label: "GPS track",
                  icon: <GpsFix size={16} weight="duotone" aria-hidden />,
                },
                {
                  id: "manual" as const,
                  label: "Manual pins",
                  icon: <Path size={16} weight="duotone" aria-hidden />,
                },
              ] as const
            ).map((mode) => {
              const selected = placementMode === mode.id;
              return (
                <UnstyledButton
                  key={mode.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPlacementModeChange(mode.id)}
                  styles={{
                    root: {
                      ...choiceChipStyles(selected).root,
                      flex: 1,
                      minHeight: "2.5rem",
                      height: "2.5rem",
                      justifyContent: "center",
                      gap: 6,
                      borderRadius: 10,
                      fontSize: "0.8125rem",
                      fontWeight: 650,
                    },
                  }}
                >
                  {mode.icon}
                  {mode.label}
                </UnstyledButton>
              );
            })}
          </div>
        ) : null}

        {placeHint ? (
          <p
            data-testid="thermometer-map-placement-place-hint"
            className="m-0 px-1 text-sm font-semibold leading-snug"
            role="status"
          >
            {placeHint}
          </p>
        ) : null}

        {!pinsReady && placementMode === "gps" ? (
          <Button
            type="button"
            fullWidth
            onClick={onStartWalk}
            disabled={!canStartWalk || isSubmitting}
            loading={gpsLoading || isSubmitting}
            styles={filledStyles}
          >
            {gpsLoading ? "Getting GPS…" : "Start track"}
          </Button>
        ) : null}

        {travelLabel ? (
          <div
            className="flex items-baseline justify-between gap-2"
            style={{
              ...askInsetSurfaceStyle,
              padding: "0.45rem 0.65rem",
            }}
          >
            <p className="m-0 min-w-0 truncate text-sm font-semibold">
              Movement: {travelLabel}
            </p>
          </div>
        ) : null}
        {travelTooShort ? (
          <p
            className="m-0 px-1 text-xs leading-snug"
            style={{ color: "var(--color-halt)" }}
          >
            Movement is shorter than the selected distance.
          </p>
        ) : null}
        {pinsReady && awaitHiderAnswer ? (
          <p
            className="m-0 px-1 text-xs leading-snug"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            Hiders answer hotter or colder in game chat once you send.
          </p>
        ) : null}

        {showSoloAnswers ? (
          <div
            data-testid="thermometer-map-placement-choices"
            role="group"
            aria-label="Thermometer answer"
            className="flex items-stretch gap-1"
            style={{
              ...askInsetSurfaceStyle,
              borderRadius: 14,
              padding: 4,
            }}
          >
            {hotterColderAnswerOptions.map((option) => {
              const selected = answer === option.value;
              const tone = option.activeClassName.includes("status-success")
                ? "success"
                : "danger";
              const Icon = option.value === "hotter" ? Flame : Snowflake;
              return (
                <UnstyledButton
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswerChange?.(option.value)}
                  styles={answerSegmentStyles(selected, tone)}
                >
                  <Icon
                    size={16}
                    weight={selected ? "fill" : "regular"}
                    aria-hidden
                  />
                  {option.label}
                </UnstyledButton>
              );
            })}
          </div>
        ) : null}

        {pinsReady && (awaitHiderAnswer || answer) ? (
          <Button
            type="button"
            fullWidth
            onClick={onCommit}
            disabled={!canCommit || isSubmitting}
            aria-busy={isSubmitting || undefined}
            leftSection={
              isSubmitting ? undefined : (
                <PaperPlaneTilt size={16} weight="fill" aria-hidden />
              )
            }
            styles={askMapPlacementSendStyles}
          >
            {isSubmitting
              ? awaitHiderAnswer
                ? "Sending…"
                : "…"
              : awaitHiderAnswer
                ? "Send to hiders"
                : "Send"}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <AskMapPlacementChrome
      testId="thermometer-map-placement"
      toolTitle="Thermometer"
      configureLabel={distanceLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={() => undefined}
      error={null}
      statusTitle=""
      statusBody=""
      toolIcon={<HudThermometerIcon width={20} height={20} />}
      questionAriaLabel="Thermometer question"
      onChangeConfigure={onChangeSetup}
      changeConfigureAriaLabel="Change thermometer distance"
      changeConfigureTestId="thermometer-change-setup"
      answerSlot={answerSlot}
      answerTall={false}
    />
  );
}
