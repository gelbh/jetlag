import type { PlayerRole } from "../../domain/playerRole";
import { playerRoleLabel } from "../../domain/playerRole";

interface RolePickerProps {
  value: PlayerRole;
  onChange: (role: PlayerRole) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS: Array<{
  value: PlayerRole;
  summary: string;
}> = [
  {
    value: "seeker",
    summary: "Ask questions, mark the map, share live location.",
  },
  {
    value: "hider",
    summary: "Answer questions, set your hiding zone, watch seekers.",
  },
];

export function RolePicker({ value, onChange, disabled }: RolePickerProps) {
  return (
    <div className="space-y-2">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
        Your side
      </p>
      <div role="radiogroup" aria-label="Player side" className="space-y-1.5">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-12 w-full border-2 px-3 py-2 text-left disabled:opacity-50 ${
              value === option.value
                ? "border-highlight bg-highlight-soft text-highlight"
                : "border-border bg-surface-deep text-ink hover:border-brand-blue"
            }`}
          >
            <span className="font-display text-sm font-semibold uppercase tracking-wide">
              {playerRoleLabel(option.value)}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {option.summary}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
