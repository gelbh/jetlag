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
  displayName: string;
  value: number;
  rank: number;
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
