/**
 * Educational tool · DnPm chip — not a primary CTA.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 * Survey world: plain label casing (field book), not Broadcast ALL-CAPS.
 * Flag on: frosted iOS status pill.
 */
import { Box } from "@mantine/core";

type AskCostChipProps = {
  toolLabel: string;
  /** Card cost token e.g. D2P1; omit for hider surfaces without spend. */
  costLabel?: string | null;
};

export function AskCostChip({ toolLabel, costLabel }: AskCostChipProps) {
  const text = costLabel ? `${toolLabel} · ${costLabel}` : toolLabel;

  return (
    <Box
      component="div"
      data-testid="ask-cost-chip"
      className="ask-cost-chip pointer-events-none cursor-default"
      role="status"
      aria-label={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        borderRadius: 999,
        padding: "0.3rem 0.65rem",
        fontSize: "0.75rem",
        fontWeight: 590,
        letterSpacing: "-0.01em",
        color: "var(--color-field-ink-muted)",
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
        border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.1)",
        boxShadow: "none",
        width: "fit-content",
      }}
    >
      {text}
    </Box>
  );
}
