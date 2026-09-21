/**
 * Map-first Thermometer chrome: hotter/colder + Send after pins / walk ready.
 * Walk setup and live walk banner stay on the sheet.
 */
import { Button, UnstyledButton } from "@mantine/core";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { HudThermometerIcon } from "@/components/map/icons/ToolIcons";
import {
  AskMapPlacementChrome,
  askMapPlacementSendStyles,
  type AskMapPlacementPhase,
} from "@/components/tools/ask/AskMapPlacementChrome";
import { hotterColderAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import {
  iosAskInsetSurfaceStyle,
  iosChoiceChipStyles,
  iosMapChromeSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";
import type { ThermometerAnswer } from "@/domain/questions";

export type ThermometerMapPlacementChromeProps = {
  distanceLabel: string;
  questionPrompt: string;
  costLabel?: string;
  travelLabel?: string | null;
  travelTooShort?: boolean;
  error?: string | null;
  awaitHiderAnswer?: boolean;
  answer?: ThermometerAnswer | null;
  onAnswerChange?: (answer: ThermometerAnswer) => void;
  canCommit?: boolean;
  isSubmitting?: boolean;
  onCommit?: () => void;
  onChangeSetup?: () => void;
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
      minHeight: "2.75rem",
      flex: 1,
      borderRadius: 12,
      fontWeight: 650,
      ...(selected ? selectedSoft : {}),
    },
  };
};

export function ThermometerMapPlacementChrome({
  distanceLabel,
  questionPrompt,
  costLabel,
  travelLabel = null,
  travelTooShort = false,
  error = null,
  awaitHiderAnswer = false,
  answer = null,
  onAnswerChange,
  canCommit = false,
  isSubmitting = false,
  onCommit,
  onChangeSetup,
}: ThermometerMapPlacementChromeProps) {
  const phase: AskMapPlacementPhase = "answer";

  const answerSlot = (
    <div
      data-testid="thermometer-map-placement-answer"
      className="flex flex-col gap-2"
    >
      {!awaitHiderAnswer && onAnswerChange ? (
        <div
          data-testid="thermometer-map-placement-choices"
          className="flex items-center justify-center gap-2"
        >
          {hotterColderAnswerOptions.map((option) => {
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
        {travelLabel ? (
          <div
            className="flex items-baseline justify-between gap-2 px-1"
            style={{
              ...iosAskInsetSurfaceStyle,
              padding: "0.4rem 0.55rem",
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
        {awaitHiderAnswer ? (
          <p
            className="m-0 px-1 text-xs leading-snug"
            style={{ color: "var(--color-field-ink-muted)" }}
          >
            Hiders answer hotter or colder in game chat once you send.
          </p>
        ) : null}
        {error ? (
          <p
            className="m-0 px-1 text-xs leading-snug"
            style={{ color: "var(--color-halt)" }}
          >
            {error}
          </p>
        ) : null}

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
      changeConfigureAriaLabel="Change thermometer setup"
      changeConfigureTestId="thermometer-change-setup"
      answerSlot={answerSlot}
      answerTall={!awaitHiderAnswer}
    />
  );
}
