/** Tailwind text color for podium ranks (1–3) and everyone else. */
export function leaderboardRankColorClass(rank: number): string {
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
