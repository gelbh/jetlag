import { GAME_SIZE_OPTIONS, type GameSize } from "../session/gameSize";
import {
  LEADERBOARD_METRICS,
  LEADERBOARD_ROLES,
  LEADERBOARD_SCOPES,
  type LeaderboardMetric,
  type LeaderboardRole,
  type LeaderboardScope,
} from "./leaderboard";

export interface LeaderboardBoardSelection {
  scope: LeaderboardScope;
  gameSize: GameSize;
  role: LeaderboardRole;
  metric: LeaderboardMetric;
}

export const DEFAULT_LEADERBOARD_BOARD: LeaderboardBoardSelection = {
  scope: "global",
  gameSize: "medium",
  role: "seeker",
  metric: "distance_traveled",
};

const STORAGE_KEY = "jl.leaderboard.board";

function isScope(v: unknown): v is LeaderboardScope {
  return typeof v === "string" && (LEADERBOARD_SCOPES as readonly string[]).includes(v);
}

function isSize(v: unknown): v is GameSize {
  return typeof v === "string" && (GAME_SIZE_OPTIONS as readonly string[]).includes(v);
}

function isRole(v: unknown): v is LeaderboardRole {
  return typeof v === "string" && (LEADERBOARD_ROLES as readonly string[]).includes(v);
}

function isMetric(v: unknown): v is LeaderboardMetric {
  return typeof v === "string" && (LEADERBOARD_METRICS as readonly string[]).includes(v);
}

export function loadLeaderboardBoardPrefs(): LeaderboardBoardSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LEADERBOARD_BOARD;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !isScope(parsed.scope) ||
      !isSize(parsed.gameSize) ||
      !isRole(parsed.role) ||
      !isMetric(parsed.metric)
    ) {
      return DEFAULT_LEADERBOARD_BOARD;
    }
    return {
      scope: parsed.scope,
      gameSize: parsed.gameSize,
      role: parsed.role,
      metric: parsed.metric,
    };
  } catch {
    return DEFAULT_LEADERBOARD_BOARD;
  }
}

export function saveLeaderboardBoardPrefs(
  selection: LeaderboardBoardSelection,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // private browsing / quota — ignore
  }
}
