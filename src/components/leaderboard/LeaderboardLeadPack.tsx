import type { Ref } from "react";
import {
  formatLeaderboardValue,
  leaderboardEntryLabel,
  type LeaderboardEntry,
  type LeaderboardMetric,
} from "../../domain/game/leaderboard";

interface LeaderboardLeadPackProps {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  viewerUid?: string | null;
  loading?: boolean;
  viewerRowRef?: Ref<HTMLLIElement | null>;
}

function medalClass(rank: number): string {
  switch (rank) {
    case 1:
      return "text-highlight";
    case 2:
      return "text-ink-secondary";
    case 3:
      return "text-action";
    default:
      return "text-ink-dim";
  }
}

function LeadSkeleton() {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="h-6 w-8 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <span className="h-6 flex-1 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <span className="h-6 w-14 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
    </li>
  );
}

export function LeaderboardLeadPack({
  entries,
  metric,
  viewerUid,
  loading = false,
  viewerRowRef,
}: LeaderboardLeadPackProps) {
  if (loading) {
    return (
      <div
        className="hud-panel px-3 py-2"
        aria-busy="true"
        aria-label="Loading top ranks"
        data-testid="leaderboard-lead-pack"
      >
        <ol className="m-0 list-none p-0">
          <LeadSkeleton />
          <LeadSkeleton />
          <LeadSkeleton />
        </ol>
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="hud-panel px-3 py-2"
      data-testid="leaderboard-lead-pack"
      aria-label="Top ranks"
    >
      <ol className="m-0 list-none p-0">
        {entries.map((entry) => {
          const isYou = viewerUid != null && entry.uid === viewerUid;
          return (
            <li
              key={entry.uid}
              ref={isYou ? viewerRowRef : undefined}
              data-testid={`leaderboard-row-${entry.uid}`}
              className={`flex items-baseline gap-3 border-b border-border/60 py-2.5 last:border-b-0 ${
                isYou ? "bg-brand-blue/10 px-2 -mx-2 rounded-md" : ""
              }`}
            >
              <span
                className={`w-8 shrink-0 font-mono text-base font-bold tabular-nums ${medalClass(entry.rank)}`}
              >
                {entry.rank}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-display text-sm font-semibold uppercase tracking-wide ${
                  isYou ? "text-brand-blue" : "text-ink"
                }`}
              >
                {leaderboardEntryLabel(entry)}
                {isYou ? (
                  <span className="ml-2 font-sans text-[10px] font-semibold tracking-[0.12em] text-brand-blue">
                    YOU
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                {formatLeaderboardValue(metric, entry.value)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
