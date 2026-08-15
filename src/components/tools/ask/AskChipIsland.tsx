/**
 * Segment/pill chip island in the thumb zone (radius, method, photo categories).
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { OptionChip, OptionChipRow } from "@/components/tools/shared/controls/OptionChip";

export type AskChipIslandChip = {
  id: string;
  label: string;
  disabled?: boolean;
};

type AskChipIslandProps = {
  chips: readonly AskChipIslandChip[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  "aria-label"?: string;
};

export function AskChipIsland({
  chips,
  selectedId = null,
  onSelect,
  "aria-label": ariaLabel = "Options",
}: AskChipIslandProps) {
  return (
    <div
      data-testid="ask-chip-island"
      className="ask-chip-island pointer-events-auto"
      role="group"
      aria-label={ariaLabel}
    >
      <OptionChipRow>
        {chips.map((chip) => (
          <OptionChip
            key={chip.id}
            selected={selectedId === chip.id}
            disabled={chip.disabled}
            onClick={() => onSelect(chip.id)}
          >
            {chip.label}
          </OptionChip>
        ))}
      </OptionChipRow>
    </div>
  );
}
