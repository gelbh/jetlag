/**
 * Map-first Measuring chrome: GPS → resolve → closer/further + Send (Matching twin).
 */
import type { ReactNode } from "react";
import { Button, UnstyledButton } from "@mantine/core";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { HudMeasuringIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
  type AskMapPlacementPhase,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { closerFurtherAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  iosAskInsetSurfaceStyle,
  iosChoiceChipStyles,
  iosMapChromeSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";
import type { MeasuringAnswer } from "@/domain/questions";
import { formatDistance, type DistanceUnit } from "@/domain/map/distance";

export type MeasuringMapPlacementPhase = AskMapPlacementPhase;

export type MeasuringMapPlacementChromeProps = {
  configureLabel: string;
  questionPrompt: string;
  costLabel?: string;
  phase: MeasuringMapPlacementPhase;
  onUseGps: () => void;
  error?: string | null;
  awaitHiderAnswer?: boolean;
  answer?: MeasuringAnswer | null;
  onAnswerChange?: (answer: MeasuringAnswer) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeConfigure?: () => void;
  seekerPlaceName?: string | null;
  targetPlaceName?: string | null;
  distanceMeters?: number | null;
  distanceUnit: DistanceUnit;
  statusTitle: string;
  statusBody: string;
  /** Target resolve / search controls while map-first. */
  midSlot?: ReactNode;
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
      minWidth: "4.5rem",
      height: "2.75rem",
      minHeight: "2.75rem",
      paddingInline: "0.75rem",
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

export function MeasuringMapPlacementChrome({
  configureLabel,
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
  onChangeConfigure,
  seekerPlaceName = null,
  targetPlaceName = null,
  distanceMeters = null,
  distanceUnit,
  statusTitle,
  statusBody,
  midSlot,
}: MeasuringMapPlacementChromeProps) {
  const distanceLabel =
    distanceMeters !== null
      ? formatDistance(distanceMeters, distanceUnit)
      : null;

  const answerSlot =
    phase === "answer" ? (
      <div
        data-testid="measuring-map-placement-answer"
        className="flex flex-col gap-2"
      >
        {!awaitHiderAnswer && onAnswerChange ? (
          <div
            data-testid="measuring-map-placement-choices"
            className="flex items-center justify-center gap-2"
          >
            {closerFurtherAnswerOptions.map((option) => {
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
          {(seekerPlaceName || targetPlaceName || distanceLabel) && (
            <div
              className="flex flex-col gap-1 px-1"
              style={{
                ...iosAskInsetSurfaceStyle,
                padding: "0.4rem 0.55rem",
              }}
            >
              {seekerPlaceName ? (
                <p className="m-0 truncate text-sm font-semibold">
                  {seekerPlaceName}
                </p>
              ) : null}
              {targetPlaceName ? (
                <p
                  className="m-0 truncate text-xs"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  → {targetPlaceName}
                </p>
              ) : null}
              {distanceLabel ? (
                <p
                  className="m-0 text-[0.6875rem] leading-none"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  {distanceLabel}
                </p>
              ) : null}
            </div>
          )}

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
      testId="measuring-map-placement"
      toolTitle="Measuring"
      configureLabel={configureLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={onUseGps}
      error={error}
      statusTitle={statusTitle}
      statusBody={statusBody}
      toolIcon={<HudMeasuringIcon width={20} height={20} />}
      questionAriaLabel="Measuring question"
      onChangeConfigure={onChangeConfigure}
      changeConfigureAriaLabel="Change measure category"
      answerSlot={answerSlot}
      answerTall={!awaitHiderAnswer}
      midSlot={midSlot}
    />
  );
}
