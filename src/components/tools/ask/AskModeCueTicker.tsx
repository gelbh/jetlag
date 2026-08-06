/**
 * GlanceVerb ticker — one imperative, verb-only. Not a button; never DnPm/cost.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
type AskModeCueTickerProps = {
  cue: string;
};

export function AskModeCueTicker({ cue }: AskModeCueTickerProps) {
  if (!cue) {
    return null;
  }

  return (
    <div
      data-testid="ask-mode-cue-ticker"
      className="ask-mode-cue-ticker pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <p className="ask-mode-cue-ticker__text font-display">{cue}</p>
    </div>
  );
}
