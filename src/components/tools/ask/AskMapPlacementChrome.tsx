/**
 * Shared map-first Ask placement chrome: GPS phases, frosted banner, Send slot.
 * Tool adapters supply answer/mid slots and labels.
 */

import { Button } from "@mantine/core";
import { CaretLeftIcon, CrosshairIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect } from "react";
import { OVERLAY_SAFE_PAD_X } from "@/components/map/chrome/OverlayHost";
import { askInlineErrorCopy } from "@/components/tools/shared/readout/AskInlineError";
import { compactFilledStyles, mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { cn } from "@/lib/cn";

export type AskMapPlacementPhase =
  | "locating"
  | "resolving"
  | "needs_permission"
  | "failed"
  | "answer";

export type AskMapPlacementChromeProps = {
  /** Root test id, e.g. matching-map-placement */
  testId: string;
  toolTitle: string;
  configureLabel: string;
  questionPrompt: string;
  costLabel?: string;
  phase: AskMapPlacementPhase;
  onUseGps: () => void;
  error?: string | null;
  statusTitle: string;
  statusBody: string;
  toolIcon: ReactNode;
  questionAriaLabel?: string;
  onChangeConfigure?: () => void;
  changeConfigureAriaLabel?: string;
  /** Override back-control test id (Matching keeps matching-change-category). */
  changeConfigureTestId?: string;
  /** Answer-phase body (choices, place card, Send). */
  answerSlot?: ReactNode;
  /** Taller bottom clearance when answer chrome includes floating choices. */
  answerTall?: boolean;
  /** Optional strip between status and location CTA. */
  midSlot?: ReactNode;
};

const frostedStatusCardStyle = {
  ...mapChromeSurfaceStyles,
  borderRadius: 14,
  color: "var(--color-field-ink)",
};

/** Soft flag CTA on frosted map chrome (tint + flag ink, not solid orange). */
export const askMapPlacementLocationCtaStyles = {
  root: {
    minHeight: "3.25rem",
    borderRadius: 14,
    border: "0.33px solid oklch(from var(--color-flag) l c h / 0.35)",
    fontWeight: 590,
    paddingInline: "0.9rem",
    paddingBlock: "0.7rem",
    backgroundColor: "oklch(from var(--color-flag) l c h / 0.16)",
    color: "var(--color-flag)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-flag) l c h / 0.22)",
    },
  },
} as const;

export const askMapPlacementSendStyles = {
  root: {
    ...compactFilledStyles.root,
    minHeight: "2.5rem",
    height: "2.5rem",
    borderRadius: 8,
    fontSize: "0.8125rem",
  },
} as const;

function StatusSpinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        borderRadius: "50%",
        border: "2px solid oklch(from var(--color-flag) l c h / 0.25)",
        borderTopColor: "var(--color-flag)",
        animation: "jl-ask-map-placement-spin 0.7s linear infinite",
      }}
    />
  );
}

function bottomClearanceForPhase(
  phase: AskMapPlacementPhase,
  hasInlineError: boolean,
  answerTall: boolean,
): string {
  if (phase === "answer") {
    if (hasInlineError) {
      return answerTall ? "16rem" : "13.5rem";
    }
    return answerTall ? "12.5rem" : "10rem";
  }
  if (phase === "failed") {
    return hasInlineError ? "13.5rem" : "10rem";
  }
  if (phase === "needs_permission") {
    return "10rem";
  }
  if (phase === "resolving") {
    return "5.5rem";
  }
  return "6.5rem";
}

export function AskMapPlacementChrome({
  testId,
  toolTitle,
  configureLabel,
  questionPrompt,
  costLabel,
  phase,
  onUseGps,
  error = null,
  statusTitle,
  statusBody,
  toolIcon,
  questionAriaLabel,
  onChangeConfigure,
  changeConfigureAriaLabel = "Change configure",
  changeConfigureTestId,
  answerSlot,
  answerTall = Boolean(answerSlot),
  midSlot,
}: AskMapPlacementChromeProps) {
  const showCta = phase === "needs_permission" || phase === "failed";
  const showMapBackup = phase === "failed";
  const showAnswer = phase === "answer";
  const showStatus = phase === "locating" || phase === "resolving";
  const failedErrorCopy = phase === "failed" && error ? askInlineErrorCopy(error) : null;
  const answerErrorCopy = phase === "answer" && error ? askInlineErrorCopy(error) : null;

  const bottomClearance = bottomClearanceForPhase(
    phase,
    Boolean(failedErrorCopy || answerErrorCopy),
    answerTall,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-ask-map-placement", "1");
    // Compat: Matching CSS/selectors during migrate.
    root.setAttribute("data-matching-map-placement", "1");
    root.style.setProperty("--ask-map-placement-bottom-clearance", bottomClearance);
    root.style.setProperty("--matching-map-bottom-clearance", bottomClearance);
    return () => {
      root.removeAttribute("data-ask-map-placement");
      root.removeAttribute("data-matching-map-placement");
      root.style.removeProperty("--ask-map-placement-bottom-clearance");
      root.style.removeProperty("--matching-map-bottom-clearance");
    };
  }, [bottomClearance]);

  return (
    <div
      data-testid={testId}
      data-ask-placement-phase={phase}
      className="pointer-events-none absolute inset-0 z-[var(--z-panel)]"
    >
      <style>{`
        @keyframes jl-ask-map-placement-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-[var(--map-banner-top)] flex flex-col gap-2",
          OVERLAY_SAFE_PAD_X,
        )}
      >
        <div
          data-testid={`${testId}-question`}
          className="flex items-center gap-2 p-2"
          style={{
            ...mapChromeSurfaceStyles,
            borderRadius: 16,
            color: "var(--color-field-ink)",
          }}
          role="status"
          aria-label={questionAriaLabel ?? `${toolTitle} question`}
        >
          {onChangeConfigure ? (
            <button
              type="button"
              data-testid={changeConfigureTestId ?? `${testId}-change-configure`}
              aria-label={changeConfigureAriaLabel}
              className="pointer-events-auto inline-flex shrink-0 items-center justify-center border-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
                color: "var(--color-field-ink)",
              }}
              onClick={onChangeConfigure}
            >
              <CaretLeftIcon size={18} weight="bold" aria-hidden />
            </button>
          ) : (
            <span
              aria-hidden
              className="inline-flex shrink-0 items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
                color: "var(--color-field-ink)",
              }}
            >
              {toolIcon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p
                className="m-0 min-w-0 flex-1 truncate text-xs font-semibold leading-none"
                style={{
                  color: "var(--color-field-ink-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                {toolTitle}
                {configureLabel ? ` · ${configureLabel}` : ""}
              </p>
              {costLabel ? (
                <span
                  data-testid="ask-cost-chip"
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 650,
                    letterSpacing: "0.02em",
                    color: "var(--color-field-ink-muted)",
                    lineHeight: 1,
                  }}
                >
                  {costLabel}
                </span>
              ) : null}
            </div>
            <p
              className="m-0 text-sm font-semibold leading-snug"
              style={{ color: "var(--color-field-ink)" }}
            >
              {questionPrompt}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 flex flex-col gap-2",
          OVERLAY_SAFE_PAD_X,
        )}
        style={{
          bottom: "max(0.75rem, var(--safe-area-bottom))",
        }}
      >
        {showStatus ? (
          <div
            data-testid={`${testId}-status`}
            className="mx-auto flex w-full max-w-[22rem] items-center gap-2.5 px-3 py-2.5"
            style={frostedStatusCardStyle}
            role="status"
          >
            <StatusSpinner />
            <div className="min-w-0 flex-1">
              <p
                className="m-0 text-xs font-semibold leading-none"
                style={{ color: "var(--color-field-ink-muted)" }}
              >
                {statusTitle}
              </p>
              <p
                className="m-0 mt-1 truncate text-sm font-medium leading-snug"
                style={{ color: "var(--color-field-ink)" }}
              >
                {statusBody}
              </p>
            </div>
          </div>
        ) : null}
        {midSlot}
        {showCta ? (
          <div
            data-testid={`${testId}-cta`}
            className="flex flex-col gap-2"
            style={{
              ...mapChromeSurfaceStyles,
              borderRadius: 16,
              padding: "0.55rem",
              color: "var(--color-field-ink)",
              ...(failedErrorCopy
                ? {
                    border: "0.33px solid oklch(from var(--color-halt) l c h / 0.4)",
                  }
                : null),
            }}
          >
            {failedErrorCopy ? (
              <div data-testid={`${testId}-error`} role="alert" className="px-1 pt-0.5">
                <p
                  className="m-0 text-sm font-semibold leading-snug"
                  style={{ color: "var(--color-halt)" }}
                >
                  {failedErrorCopy.title}
                </p>
                <p
                  className="m-0 mt-1 text-xs leading-snug"
                  style={{ color: "var(--color-field-ink-muted)" }}
                >
                  {failedErrorCopy.detail}
                </p>
              </div>
            ) : null}
            <Button
              type="button"
              fullWidth
              onClick={onUseGps}
              styles={askMapPlacementLocationCtaStyles}
              className="flex items-center justify-start gap-3"
            >
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
                aria-hidden
                style={{
                  borderRadius: 11,
                  backgroundColor: "oklch(from var(--color-flag) l c h / 0.18)",
                  color: "var(--color-flag)",
                }}
              >
                <CrosshairIcon size={18} weight="bold" />
              </span>
              <span className="flex min-w-0 flex-col items-start gap-0.5 text-left leading-tight">
                <span className="text-sm font-semibold">
                  {phase === "failed" ? "Try location again" : "Use my location"}
                </span>
                {!failedErrorCopy ? (
                  <span
                    className="text-xs font-normal"
                    style={{
                      color: "oklch(from var(--color-flag) l c h / 0.85)",
                    }}
                  >
                    {phase === "failed" ? "GPS did not lock" : "Allow location when prompted"}
                  </span>
                ) : null}
              </span>
            </Button>
            {showMapBackup ? (
              <p
                data-testid={`${testId}-backup`}
                className="m-0 px-1 text-center text-xs leading-snug"
                style={{ color: "var(--color-field-ink-muted)" }}
              >
                Or tap the map to set your anchor.
              </p>
            ) : null}
          </div>
        ) : null}
        {showAnswer && answerErrorCopy ? (
          <div
            data-testid={`${testId}-answer-error`}
            role="alert"
            className="mx-auto w-full max-w-[22rem] px-3 py-2.5"
            style={{
              ...mapChromeSurfaceStyles,
              borderRadius: 14,
              border: "0.33px solid oklch(from var(--color-halt) l c h / 0.4)",
              color: "var(--color-field-ink)",
            }}
          >
            <p
              className="m-0 text-sm font-semibold leading-snug"
              style={{ color: "var(--color-halt)" }}
            >
              {answerErrorCopy.title}
            </p>
            <p
              className="m-0 mt-1 text-xs leading-snug"
              style={{ color: "var(--color-field-ink-muted)" }}
            >
              {answerErrorCopy.detail}
            </p>
          </div>
        ) : null}
        {showAnswer ? answerSlot : null}
      </div>
    </div>
  );
}
