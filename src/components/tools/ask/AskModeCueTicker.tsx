/**
 * GlanceVerb ticker — one imperative, verb-only. Not a button; never DnPm/cost.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Paper } from "@mantine/core";
import { Island } from "@/components/ui/island";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { cn } from "@/lib/cn";

type AskModeCueTickerProps = {
  cue: string;
};

export function AskModeCueTicker({ cue }: AskModeCueTickerProps) {
  const mantinePlayerUi = usePlayerUiMantine();

  if (!cue) {
    return null;
  }

  if (mantinePlayerUi) {
    return (
      <Paper
        data-testid="ask-mode-cue-ticker"
        data-player-ux-world="mantine"
        role="status"
        aria-live="polite"
        radius={14}
        p="sm"
        className={cn(
          "ask-mode-cue-ticker pointer-events-none w-full max-w-md justify-center",
        )}
        styles={{
          root: {
            ...iosMapChromeSurfaceStyles,
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
