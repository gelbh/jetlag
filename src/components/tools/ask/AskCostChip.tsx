/**
 * Educational tool · DnPm chip — not a primary CTA.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 * Survey world: plain label casing (field book), not Broadcast ALL-CAPS.
 */
import { chipVariants } from "@/components/ui/chip";
import { cn } from "@/lib/cn";

type AskCostChipProps = {
  toolLabel: string;
  /** Card cost token e.g. D2P1; omit for hider surfaces without spend. */
  costLabel?: string | null;
};

export function AskCostChip({ toolLabel, costLabel }: AskCostChipProps) {
  const text = costLabel ? `${toolLabel} · ${costLabel}` : toolLabel;

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
