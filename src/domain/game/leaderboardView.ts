import { gameSizeLabel, type GameSize } from "../session/gameSize";
import { playerRoleLabel } from "../session/playerRole";
import {
  leaderboardMetricLabel,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardRole,
} from "./leaderboard";

export function leaderboardBoardSummaryLabel(selection: {
  gameSize: GameSize;
  role: LeaderboardRole;
  metric: LeaderboardMetric;
}): string {
  return `${gameSizeLabel(selection.gameSize).label} · ${playerRoleLabel(selection.role)} · ${leaderboardMetricLabel(selection.metric, selection.role)}`;
}

export function splitLeadPack(entries: LeaderboardEntry[]): {
  lead: LeaderboardEntry[];
  rest: LeaderboardEntry[];
} {
  return {
    lead: entries.slice(0, 3),
    rest: entries.slice(3),
  };
}

export type SelfFooterMode =
  | "hidden"
  | "pinned"
  | "off_list"
  | "unranked"
  | "error";

export function resolveSelfFooterMode(input: {
  viewerUid: string | null | undefined;
  listEntry: LeaderboardEntry | null;
  selfEntry: LeaderboardEntry | null;
  selfError: boolean;
  selfLoading?: boolean;
  rowInView: boolean;
}): SelfFooterMode {
  if (!input.viewerUid) return "hidden";
  if (input.listEntry) {
    return input.rowInView ? "hidden" : "pinned";
  }
  if (input.selfLoading) return "hidden";
  if (input.selfError) return "error";
  if (input.selfEntry) return "off_list";
  return "unranked";
}
