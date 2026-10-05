/**
 * Map-first Matching chrome: GPS-first anchor, then on-map answer / send.
 * Thin adapter over AskMapPlacementChrome.
 */
import { Button, UnstyledButton } from "@mantine/core";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { HudMatchingIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  type AskMapPlacementPhase,
  askMapPlacementSendStyles,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { binaryAnswerIcon } from "@/components/tools/shared/answers/binaryAnswerIcons";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  askInsetSurfaceStyle,
  choiceChipStyles,
  mapChromeSurfaceStyles,
} from "@/components/ui/entry/entryChrome";
import type { MatchingAnswer } from "@/domain/questions";

export type MatchingMapPlacementPhase = AskMapPlacementPhase;

export type MatchingMapPlacementChromeProps = {
  categoryLabel: string;
  questionPrompt: string;
  costLabel?: string;
  phase: MatchingMapPlacementPhase;
  onUseGps: () => void;
  error?: string | null;
  nearestPlaceName?: string | null;
  awaitHiderAnswer?: boolean;
  nearestSummary?: string | null;
  nullAnswerMessage?: string | null;
  answer?: MatchingAnswer | null;
  onAnswerChange?: (answer: MatchingAnswer) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  /** Reopen Matching catalog sheet to pick a different category. */
  onChangeCategory?: () => void;
};

const compactChoiceStyles = (selected: boolean, tone: "success" | "danger" | "default") => {
  const base = choiceChipStyles(selected, tone);
  const selectedSoft =
    tone === "success"
      ? {
          backgroundColor:
            "color-mix(in oklch, var(--color-canvas) 72%, var(--color-status-success) 28%)",
          color: "var(--color-status-success)",
          border: "0.5px solid oklch(from var(--color-status-success) l c h / 0.55)",
        }
      : tone === "danger"
        ? {
            backgroundColor: "color-mix(in oklch, var(--color-canvas) 72%, var(--color-halt) 28%)",
            color: "var(--color-halt)",
            border: "0.5px solid oklch(from var(--color-halt) l c h / 0.55)",
          }
        : {
            backgroundColor: "color-mix(in oklch, var(--color-canvas) 72%, var(--color-flag) 28%)",
            color: "var(--color-flag)",
            border: "0.5px solid oklch(from var(--color-flag) l c h / 0.5)",
          };

  return {
    root: {
      ...base.root,
      flex: 1,
      minHeight: "2.75rem",
      height: "2.75rem",
      paddingInline: "0.7rem",
      borderRadius: 10,
      fontSize: "0.8125rem",
      fontWeight: 650,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
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
            border: "0.5px solid oklch(from var(--color-field-ink) l c h / 0.18)",
            backdropFilter: "blur(24px) saturate(1.35)",
            WebkitBackdropFilter: "blur(24px) saturate(1.35)",
          }),
      boxShadow: "0 6px 18px 0 oklch(0.12 0.04 265 / 0.32), 0 1px 0 0 oklch(1 0 0 / 0.35) inset",
    },
  };
};

export function MatchingMapPlacementChrome({
  categoryLabel,
  questionPrompt,
  costLabel,
  phase,
  onUseGps,
  error = null,
  nearestPlaceName = null,
  awaitHiderAnswer = false,
  nearestSummary = null,
  nullAnswerMessage = null,
  answer = null,
  onAnswerChange,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeCategory,
}: MatchingMapPlacementChromeProps) {
  const statusTitle =
    phase === "locating"
      ? "Getting your location"
      : nearestPlaceName
        ? "Nearest place found"
        : "Finding nearest place";
  const statusBody =
    phase === "locating"
      ? "Waiting for GPS…"
      : nearestPlaceName
        ? nearestPlaceName
        : "Loading places on the map…";

  const answerSlot =
    phase === "answer" ? (
      <div data-testid="matching-map-placement-answer" className="flex flex-col gap-2">
        {!awaitHiderAnswer && onAnswerChange ? (
          <div
            data-testid="matching-map-placement-choices"
            className="flex items-center justify-center gap-2"
          >
            {yesNoAnswerOptions.map((option) => {
              const selected = answer === option.value;
              const tone = option.activeClassName.includes("status-success")
                ? "success"
                : option.activeClassName.includes("status-negative")
                  ? "danger"
                  : "default";
              const Icon = binaryAnswerIcon(option.value);
              return (
                <UnstyledButton
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswerChange(option.value)}
                  styles={compactChoiceStyles(selected, tone)}
                >
                  {Icon ? (
                    <Icon size={16} weight={selected ? "bold" : "regular"} aria-hidden />
                  ) : null}
                  {option.label}
                </UnstyledButton>
              );
            })}
          </div>
        ) : null}

        <div
          className="flex flex-col gap-2"
          style={{
            ...mapChromeSurfaceStyles,
            borderRadius: 16,
            padding: "0.55rem",
            color: "var(--color-field-ink)",
          }}
        >
          {nullAnswerMessage ? (
            <p
              className="m-0 px-1 text-xs leading-snug"
              style={{ color: "var(--color-field-ink-muted)" }}
            >
              {nullAnswerMessage}
            </p>
          ) : nearestPlaceName ? (
            <div
              className="flex items-baseline justify-between gap-2 px-1"
              style={{
                ...askInsetSurfaceStyle,
                padding: "0.4rem 0.55rem",
              }}
            >
              <p className="m-0 min-w-0 truncate text-sm font-semibold">{nearestPlaceName}</p>
              {nearestSummary && nearestSummary !== nearestPlaceName ? (
                <p
                  className="m-0 shrink-0 text-[0.6875rem] leading-none"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  {nearestSummary.replace(`${nearestPlaceName} · `, "")}
                </p>
              ) : null}
            </div>
          ) : null}

          {awaitHiderAnswer ? (
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
              {isSubmitting ? "Sending…" : "Send to hiders"}
            </Button>
          ) : answer ? (
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
              {isSubmitting ? "…" : "Send"}
            </Button>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <AskMapPlacementChrome
      testId="matching-map-placement"
      toolTitle="Matching"
      configureLabel={categoryLabel}
      questionPrompt={questionPrompt}
      costLabel={costLabel}
      phase={phase}
      onUseGps={onUseGps}
      error={error}
      statusTitle={statusTitle}
      statusBody={statusBody}
      toolIcon={<HudMatchingIcon width={20} height={20} />}
      questionAriaLabel="Matching question"
      onChangeConfigure={onChangeCategory}
      changeConfigureAriaLabel="Change category"
      changeConfigureTestId="matching-change-category"
      answerSlot={answerSlot}
      answerTall={!awaitHiderAnswer}
    />
  );
}
