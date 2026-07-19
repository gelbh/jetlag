interface LeaderboardBoardChipProps {
  label: string;
  onClick: () => void;
  expanded?: boolean;
}

export function LeaderboardBoardChip({
  label,
  onClick,
  expanded = false,
}: LeaderboardBoardChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={`Board: ${label}. Choose board`}
      className="hud-chrome inline-flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left"
    >
      <span className="min-w-0 truncate font-display text-xs font-semibold uppercase tracking-wide text-ink">
        {label}
      </span>
      <span aria-hidden="true" className="shrink-0 text-ink-muted">
        ▾
      </span>
    </button>
  );
}
