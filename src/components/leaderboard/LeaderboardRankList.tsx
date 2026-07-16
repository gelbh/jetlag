import { formatLeaderboardValue, leaderboardEntryLabel } from "../../domain/game/leaderboard";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
} from "../../domain/game/leaderboard";

interface LeaderboardRankListProps {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  viewerUid?: string | null;
  loading?: boolean;
  emptyMessage: string;
}

function RankSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      <span className="h-5 w-8 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <span className="h-5 flex-1 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <span className="h-5 w-14 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
    </li>
  );
}

export function LeaderboardRankList({
  entries,
  metric,
  viewerUid,
  loading = false,
  emptyMessage,
}: LeaderboardRankListProps) {
  if (loading) {
    return (
      <ol className="m-0 list-none p-0" aria-busy="true" aria-label="Loading ranks">
        <RankSkeleton />
        <RankSkeleton />
        <RankSkeleton />
      </ol>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">{emptyMessage}</p>
    );
  }

  return (
    <ol className="m-0 list-none p-0" aria-label="Leaderboard ranks">
      {entries.map((entry) => {
        const isYou = viewerUid != null && entry.uid === viewerUid;
        return (
          <li
            key={entry.uid}
            className={`flex items-baseline gap-3 border-b border-border/60 py-3 last:border-b-0 ${
              isYou ? "bg-brand-blue/10 px-2 -mx-2 rounded-md" : ""
            }`}
          >
            <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-ink-dim">
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
  );
}
