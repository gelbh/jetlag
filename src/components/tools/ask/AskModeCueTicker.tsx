/**
 * GlanceVerb ticker — one imperative, verb-only. Not a button; never DnPm/cost.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Paper } from "@mantine/core";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { cn } from "@/lib/cn";

type AskModeCueTickerProps = {
  cue: string;
};

export function AskModeCueTicker({ cue }: AskModeCueTickerProps) {
  if (!cue) {
    return null;
  }

  return (
    <Paper
      data-testid="ask-mode-cue-ticker"
      role="status"
      aria-live="polite"
      radius={14}
      p="sm"
      className={cn("pointer-events-none mx-auto w-full max-w-md justify-center")}
      styles={{
        root: {
          ...mapChromeSurfaceStyles,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      <p
        className="ask-mode-cue-ticker__text"
        style={{
          margin: 0,
          fontWeight: 590,
          fontSize: "0.9375rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--color-field-ink)",
          textAlign: "center",
        }}
      >
        {cue}
      </p>
    </Paper>
  );
}
