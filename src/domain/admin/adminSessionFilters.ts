import type {
  AdminSessionPhase,
  AdminSessionSummary,
} from "../../services/admin/adminSessions";
import { resolveAdminSessionAreaLabel } from "./adminSessionAreaLabel";

export type AdminSessionPhaseFilter = AdminSessionPhase | "all";

export function filterAdminSessions(
  sessions: readonly AdminSessionSummary[],
  input: {
    query: string;
    phase: AdminSessionPhaseFilter;
    multiplayerOnly?: boolean;
  },
): AdminSessionSummary[] {
  const normalizedQuery = input.query.trim().toLowerCase();

  return sessions.filter((summary) => {
    if (input.multiplayerOnly && summary.memberCount < 2) {
      return false;
    }

    if (input.phase !== "all" && summary.phase !== input.phase) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const areaLabel = resolveAdminSessionAreaLabel(summary)?.toLowerCase() ?? "";
    return (
      summary.code.toLowerCase().includes(normalizedQuery) ||
      areaLabel.includes(normalizedQuery)
    );
  });
}

export function summarizeAdminSessions(sessions: readonly AdminSessionSummary[]) {
  const byPhase: Record<AdminSessionPhase, number> = {
    waiting: 0,
    hiding: 0,
    seek: 0,
    "end-game-pending": 0,
    "end-game-active": 0,
  };

  let multiplayer = 0;

  for (const summary of sessions) {
    byPhase[summary.phase] += 1;
    if (summary.memberCount >= 2) {
      multiplayer += 1;
    }
  }

  return {
    live: sessions.length,
    multiplayer,
    byPhase,
  };
}
