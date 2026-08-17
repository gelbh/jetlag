/**
 * GlanceVerb ticker — one imperative, verb-only. Not a button; never DnPm/cost.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Island } from "@/components/ui/island";
import { cn } from "@/lib/cn";

type AskModeCueTickerProps = {
  cue: string;
};

export function AskModeCueTicker({ cue }: AskModeCueTickerProps) {
  if (!cue) {
    return null;
  }

  return (
    <Island
      data-testid="ask-mode-cue-ticker"
      size="densify"
      className={cn(
        "ask-mode-cue-ticker pointer-events-none w-full max-w-md justify-center shadow-[var(--shadow-hud-float)]",
      )}
      role="status"
      aria-live="polite"
    >
      <p className="ask-mode-cue-ticker__text font-display">{cue}</p>
    </Island>
  );
}
