/**
 * Map-first Radar chrome: shared placement shell + Yes/No + distance mid-strip.
 */
import { Button, UnstyledButton } from "@mantine/core";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { HudRadarIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  type AskMapPlacementPhase,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { RadarDistancePicker } from "@/components/tools/RadarDistancePicker";
import { binaryAnswerIcon } from "@/components/tools/shared/answers/binaryAnswerIcons";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  askInsetSurfaceStyle,
  choiceChipStyles,
  mapChromeSurfaceStyles,
} from "@/components/ui/entry/entryChrome";
import type { DistanceUnit } from "@/domain/map/distance";
import type { RadarAnswer, RadarDistanceOptionKey } from "@/domain/questions";
import type { GameSize } from "@/domain/session/size/gameSize";

export type RadarMapPlacementPhase = AskMapPlacementPhase;

export type RadarMapPlacementChromeProps = {
  distanceLabel: string;
  questionPrompt: string;
  costLabel?: string;
  phase: RadarMapPlacementPhase;
  onUseGps: () => void;
  error?: string | null;
  awaitHiderAnswer?: boolean;
  answer?: RadarAnswer | null;
  onAnswerChange?: (answer: RadarAnswer) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeDistance?: () => void;
  /** Compact distance strip while map-first. */
  radiusMeters: number | null;
  chooseCustom: boolean;
  customRadius: string;
  distanceUnit: DistanceUnit;
  gameSize: GameSize;
  usedDistanceOptions: ReadonlySet<RadarDistanceOptionKey>;
  onPresetSelect: (radiusMeters: number) => void;
  onChooseSelect: () => void;
  onCustomRadiusChange: (value: string) => void;
};

/** iOS segmented Yes/No — solid selected chip tones inside an inset track. */
const answerSegmentStyles = (selected: boolean, tone: "success" | "danger") => {
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
      transition: "background-color 160ms ease, color 160ms ease, transform 120ms ease",
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

export function RadarMapPlacementChrome({
  distanceLabel,
  questionPrompt,
  costLabel,
  phase,
  onUseGps,
  error = null,
  awaitHiderAnswer = false,
  answer = null,
  onAnswerChange,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeDistance,
  radiusMeters,
  chooseCustom,
  customRadius,
  distanceUnit,
  gameSize,
  usedDistanceOptions,
  onPresetSelect,
  onChooseSelect,
  onCustomRadiusChange,
}: RadarMapPlacementChromeProps) {
  const statusTitle = phase === "locating" ? "Getting your location" : "Ready";
  const statusBody = phase === "locating" ? "Waiting for GPS…" : distanceLabel;

  const showSoloAnswers = phase === "answer" && !awaitHiderAnswer && Boolean(onAnswerChange);

  const distancePlate = (
    <div
      data-testid="radar-map-placement-distance"
      className="mx-auto w-full max-w-[22rem]"
      style={{
        ...mapChromeSurfaceStyles,
        borderRadius: 16,
        padding: "0.55rem",
        color: "var(--color-field-ink)",
      }}
    >
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
        showPrompt={false}
        compact
      />
      {showSoloAnswers ? (
        <div
          data-testid="radar-map-placement-choices"
          className="mt-2.5"
          style={{
            paddingTop: 10,
            borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
          }}
        >
          <div
            role="group"
            aria-label="Radar answer"
            className="flex items-stretch gap-1"
            style={{
              ...askInsetSurfaceStyle,
              borderRadius: 14,
              padding: 4,
            }}
          >
            {yesNoAnswerOptions.map((option) => {
              const selected = answer === option.value;
              const tone = option.activeClassName.includes("status-success") ? "success" : "danger";
              const Icon = binaryAnswerIcon(option.value);
              return (
                <UnstyledButton
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswerChange?.(option.value)}
                  styles={answerSegmentStyles(selected, tone)}
                >
                  {Icon ? (
                    <Icon size={16} weight={selected ? "bold" : "regular"} aria-hidden />
                  ) : null}
                  {option.label}
                </UnstyledButton>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const midSlot =
    phase === "answer" || phase === "locating" || phase === "failed" ? distancePlate : null;

  const answerSlot =
    phase === "answer" ? (
      <div data-testid="radar-map-placement-answer" className="flex flex-col gap-2">
        {awaitHiderAnswer || answer ? (
          <div
            className="flex flex-col gap-2"
            style={{
              ...mapChromeSurfaceStyles,
              borderRadius: 16,
              padding: "0.55rem",
              color: "var(--color-field-ink)",
            }}
          >
            <Button
              type="button"
              fullWidth
              onClick={onCommit}
              disabled={!canCommit || isSubmitting}
              aria-busy={isSubmitting || undefined}
              leftSection={
                isSubmitting ? undefined : (
                  <PaperPlaneTiltIcon size={16} weight="fill" aria-hidden />
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
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <AskMapPlacementChrome
      testId="radar-map-placement"
      toolTitle="Radar"
      configureLabel={distanceLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={onUseGps}
      error={error}
      statusTitle={statusTitle}
      statusBody={statusBody}
      toolIcon={<HudRadarIcon width={20} height={20} />}
      questionAriaLabel="Radar question"
      onChangeConfigure={onChangeDistance}
      changeConfigureAriaLabel="Change distance"
      answerSlot={answerSlot}
      answerTall={false}
      midSlot={midSlot}
    />
  );
}
