import type { GameSize } from "../session/gameSize";

export type LeaderboardScope = "global" | "friends";
export type LeaderboardRole = "seeker" | "hider";

export type LeaderboardMetric =
  | "distance_traveled"
  | "max_from_start"
  | "questions"
  | "avg_answer_time"
  | "phase_time"
  | "wins"
  | "round_duration";

export const LEADERBOARD_SCOPES: readonly LeaderboardScope[] = [
  "global",
  "friends",
] as const;

export const LEADERBOARD_ROLES: readonly LeaderboardRole[] = [
  "seeker",
  "hider",
] as const;

export const LEADERBOARD_METRICS: readonly LeaderboardMetric[] = [
  "distance_traveled",
  "max_from_start",
  "questions",
  "avg_answer_time",
  "phase_time",
  "wins",
  "round_duration",
] as const;

export interface LeaderboardEntry {
  uid: string;
  /** Public handle; may mirror legacy displayName from older writers. */
  displayName: string;
  value: number;
  rank: number;
}

export function leaderboardEntryLabel(entry: LeaderboardEntry): string {
  const label = entry.displayName.trim();
  return label.length > 0 ? label : "Player";
}

/** Format a board value for the active metric (meters / ms / counts). */
export function formatLeaderboardValue(
  metric: LeaderboardMetric,
  value: number,
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  switch (metric) {
    case "distance_traveled":
    case "max_from_start": {
      const meters = Math.max(0, value);
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
      }
      return `${Math.round(meters)} m`;
    }
    case "avg_answer_time":
    case "phase_time":
    case "round_duration": {
      const totalSeconds = Math.max(0, Math.round(value / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
    case "questions":
    case "wins":
      return String(Math.round(value));
    default: {
      const never: never = metric;
      return never;
    }
  }
}

export function leaderboardMetricLabel(
  metric: LeaderboardMetric,
  role: LeaderboardRole,
): string {
  switch (metric) {
    case "distance_traveled":
      return "Distance traveled";
    case "max_from_start":
      return "Max from start";
    case "questions":
      return role === "seeker" ? "Questions asked" : "Questions received";
    case "avg_answer_time":
      return "Avg answer time";
    case "phase_time":
      return role === "seeker" ? "Seek time" : "Hiding time";
    case "wins":
      return "Wins";
    case "round_duration":
      return "Round duration";
    default: {
      const never: never = metric;
      return never;
    }
  }
}

export function leaderboardScopeLabel(scope: LeaderboardScope): string {
  switch (scope) {
    case "global":
      return "Global";
    case "friends":
      return "Friends";
    default: {
      const never: never = scope;
      return never;
    }
  }
}

export function leaderboardBoardKey(
  scope: LeaderboardScope,
  gameSize: GameSize,
  role: LeaderboardRole,
  metric: LeaderboardMetric,
): string {
  return `${scope}/${gameSize}/${role}/${metric}`;
}
