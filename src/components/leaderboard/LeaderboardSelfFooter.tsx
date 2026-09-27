import {
  formatLeaderboardValue,
  type LeaderboardEntry,
  type LeaderboardMetric,
} from "../../domain/game/leaderboard";
import type { SelfFooterMode } from "../../domain/game/leaderboardView";

interface LeaderboardSelfFooterProps {
  mode: SelfFooterMode;
  entry: LeaderboardEntry | null;
  metric: LeaderboardMetric;
  onJump?: () => void;
}

export function LeaderboardSelfFooter({
  mode,
  entry,
  metric,
  onJump,
}: LeaderboardSelfFooterProps) {
  switch (mode) {
    case "hidden":
      return null;
    case "pinned":
    case "off_list":
    case "unranked":
    case "error":
      break;
    default: {
      const never: never = mode;
      return never;
    }
  }

  const interactive = mode === "pinned" && onJump != null;
  const muted = mode === "unranked" || mode === "error";
  const label =
    mode === "unranked"
      ? "Not ranked on this board"
      : mode === "error"
        ? "Couldn't load your rank"
        : entry
          ? `#${entry.rank} · YOU · ${formatLeaderboardValue(metric, entry.value)}`
          : "YOU";

  const sharedClassName =
    "fixed inset-x-0 bottom-0 z-[var(--z-banner)] border-t-2 border-highlight bg-surface-panel px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-opacity duration-200 motion-reduce:transition-none";

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onJump}
        data-testid="leaderboard-self-footer"
        className={`${sharedClassName} flex min-h-11 w-full items-center justify-center text-center font-display text-sm font-semibold uppercase tracking-wide text-ink`}
        aria-label={`Your rank: ${label}. Jump to row`}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      data-testid="leaderboard-self-footer"
      role="status"
      className={`${sharedClassName} flex min-h-11 items-center justify-center text-center font-display text-sm font-semibold uppercase tracking-wide ${
        muted ? "text-ink-muted" : "text-ink"
      }`}
    >
      {label}
    </div>
  );
}
