/**
 * Shared Ask HUD question header (Matching / Measuring / Tentacle language).
 * Icon + optional cost under icon, tool label, prompt.
 */
import type { ReactNode } from "react";
import { QuestionPromptBlock } from "@/components/tools/shared/controls/QuestionPromptBlock";
import { iosAskInsetSurfaceStyle } from "@/components/ui/apple/iosEntryChrome";

export type AskToolQuestionHeaderProps = {
  toolLabel: string;
  costLabel?: string | null;
  icon: ReactNode;
  prompt: string;
  ruleSummary?: string | null;
  /** When false, uses Survey ask-hud-panel chrome instead of iOS inset. */
  mantine?: boolean;
};

export function AskToolQuestionHeader({
  toolLabel,
  costLabel = null,
  icon,
  prompt,
  ruleSummary = null,
  mantine = true,
}: AskToolQuestionHeaderProps) {
  return (
    <div
      className={
        mantine
          ? "pointer-events-auto space-y-2 p-3"
          : "pointer-events-auto ask-hud-panel space-y-2 p-3"
      }
      style={mantine ? iosAskInsetSurfaceStyle : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex shrink-0 flex-col items-center gap-1"
          style={{ minWidth: 44 }}
        >
          <span
            aria-hidden
            className="inline-flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
              color: "var(--color-field-ink)",
            }}
          >
            {icon}
          </span>
          {costLabel ? (
            <span
              data-testid="ask-cost-chip"
              role="status"
              aria-label={`${toolLabel} · ${costLabel}`}
              style={{
                fontSize: "0.6875rem",
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
        <div className="min-w-0 flex-1">
          <p
            className="m-0 mb-0.5 text-xs font-semibold leading-none"
            style={{
              color: "var(--color-field-ink-muted)",
              letterSpacing: "0.02em",
            }}
          >
            {toolLabel}
          </p>
          <QuestionPromptBlock
            prompt={prompt}
            ruleSummary={ruleSummary ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
