/**
 * Educational tool · DnPm chip — not a primary CTA.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 * Survey world: plain label casing (field book), not Broadcast ALL-CAPS.
 * Flag on: frosted iOS status pill.
 */
import { Box } from "@mantine/core";
import { chipVariants } from "@/components/ui/chip";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { cn } from "@/lib/cn";

type AskCostChipProps = {
  toolLabel: string;
  /** Card cost token e.g. D2P1; omit for hider surfaces without spend. */
  costLabel?: string | null;
};

export function AskCostChip({ toolLabel, costLabel }: AskCostChipProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const text = costLabel ? `${toolLabel} · ${costLabel}` : toolLabel;

  if (mantinePlayerUi) {
    return (
      <Box
        component="div"
        data-testid="ask-cost-chip"
        data-player-ux-world="mantine"
        className="ask-cost-chip pointer-events-none cursor-default"
        role="status"
        aria-label={text}
        style={{
          ...iosMapChromeSurfaceStyles,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          padding: "0.35rem 0.75rem",
          fontSize: "0.8125rem",
          fontWeight: 590,
          letterSpacing: "-0.01em",
          color: "var(--color-field-ink)",
          width: "fit-content",
        }}
      >
        {text}
      </Box>
    );
  }

  return (
    <div
      data-testid="ask-cost-chip"
      data-survey="true"
      className={cn(
        chipVariants({ variant: "default", size: "densify" }),
        "ask-cost-chip pointer-events-none cursor-default font-display",
      )}
      role="status"
      aria-label={text}
    >
      {text}
    </div>
  );
}
