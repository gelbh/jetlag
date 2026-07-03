import type { ReactNode } from "react";

interface OptionChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function OptionChip({
  selected,
  onClick,
  children,
  disabled = false,
}: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-12 rounded-[var(--radius-hud-md)] px-3 text-sm font-medium disabled:opacity-40 ${
        selected
          ? "bg-action text-action-ink"
          : "bg-surface-raised text-ink-secondary"
      }`}
    >
      {children}
    </button>
  );
}

interface OptionChipRowProps {
  children: ReactNode;
}

export function OptionChipRow({ children }: OptionChipRowProps) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
