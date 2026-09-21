/**
 * Map-first Radar chrome: shared placement shell + Yes/No + distance mid-strip.
 */
import { Button, UnstyledButton } from "@mantine/core";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { HudRadarIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
  type AskMapPlacementPhase,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { RadarDistancePicker } from "@/components/tools/RadarDistancePicker";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  iosChoiceChipStyles,
  iosMapChromeSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";
import type { DistanceUnit } from "@/domain/map/distance";
import type {
  RadarAnswer,
  RadarDistanceOptionKey,
} from "@/domain/questions";
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

const compactChoiceStyles = (
  selected: boolean,
  tone: "success" | "danger" | "default",
) => {
  const base = iosChoiceChipStyles(selected, tone);
  const selectedSoft =
    tone === "success"
      ? {
          backgroundColor:
            "color-mix(in oklch, var(--color-canvas) 72%, var(--color-status-success) 28%)",
          color: "var(--color-status-success)",
          border:
            "0.5px solid oklch(from var(--color-status-success) l c h / 0.55)",
        }
      : tone === "danger"
        ? {
            backgroundColor:
              "color-mix(in oklch, var(--color-canvas) 72%, var(--color-halt) 28%)",
            color: "var(--color-halt)",
            border: "0.5px solid oklch(from var(--color-halt) l c h / 0.55)",
          }
        : {
            backgroundColor:
              "color-mix(in oklch, var(--color-canvas) 72%, var(--color-flag) 28%)",
            color: "var(--color-flag)",
            border: "0.5px solid oklch(from var(--color-flag) l c h / 0.5)",
          };

  return {
    root: {
      ...base.root,
      width: "2.75rem",
      height: "2.75rem",
      minWidth: "2.75rem",
      minHeight: "2.75rem",
      padding: 0,
      borderRadius: 10,
      fontSize: "0.8125rem",
      fontWeight: 650,
      flex: "0 0 auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...(selected
        ? {
            ...selectedSoft,
            "&:hover:not(:disabled)": {
              backgroundColor: selectedSoft.backgroundColor,
            },
          }
        : {
            backgroundColor: "oklch(from var(--color-canvas) l c h / 0.96)",
            color: "var(--color-field-ink)",
            border:
              "0.5px solid oklch(from var(--color-field-ink) l c h / 0.18)",
            backdropFilter: "blur(24px) saturate(1.35)",
            WebkitBackdropFilter: "blur(24px) saturate(1.35)",
          }),
      boxShadow:
        "0 6px 18px 0 oklch(0.12 0.04 265 / 0.32), 0 1px 0 0 oklch(1 0 0 / 0.35) inset",
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
  const statusTitle =
    phase === "locating" ? "Getting your location" : "Ready";
  const statusBody =
    phase === "locating" ? "Waiting for GPS…" : distanceLabel;

  const midSlot =
    phase === "answer" || phase === "locating" || phase === "failed" ? (
      <div
        data-testid="radar-map-placement-distance"
        className="mx-auto w-full max-w-[22rem]"
        style={{
          ...iosMapChromeSurfaceStyles,
          borderRadius: 14,
          padding: "0.45rem",
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
        />
      </div>
    ) : null;

  const answerSlot =
    phase === "answer" ? (
      <div
        data-testid="radar-map-placement-answer"
        className="flex flex-col gap-2"
      >
        {!awaitHiderAnswer && onAnswerChange ? (
          <div
            data-testid="radar-map-placement-choices"
            className="flex items-center justify-center gap-2"
          >
            {yesNoAnswerOptions.map((option) => {
              const selected = answer === option.value;
              const tone = option.activeClassName.includes("status-success")
                ? "success"
                : option.activeClassName.includes("status-negative")
                  ? "danger"
                  : "default";
              return (
                <UnstyledButton
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswerChange(option.value)}
                  styles={compactChoiceStyles(selected, tone)}
                >
                  {option.label}
                </UnstyledButton>
              );
            })}
          </div>
        ) : null}

        <div
          className="flex flex-col gap-2"
          style={{
            ...iosMapChromeSurfaceStyles,
            borderRadius: 16,
            padding: "0.55rem",
            color: "var(--color-field-ink)",
          }}
        >
          {awaitHiderAnswer || answer ? (
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
      answerTall={!awaitHiderAnswer}
      midSlot={midSlot}
    />
  );
}
