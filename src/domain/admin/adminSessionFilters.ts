import type {
  AdminSessionMode,
  AdminSessionPhase,
  AdminSessionSummary,
} from "../../services/admin/adminSessions";
import { resolveAdminSessionAreaLabel } from "./adminSessionAreaLabel";

export type AdminSessionPhaseFilter = AdminSessionPhase | "all";
export type AdminSessionModeFilter = AdminSessionMode | "all";
export type AdminSessionStateChip = "hiding" | "seek" | "end-game" | null;
export type AdminSessionSort = "lastActivity" | "lastLocation" | "created";

export interface AdminSessionFilterInput {
  query: string;
  liveOnly: boolean;
  mode: AdminSessionModeFilter;
  state: AdminSessionStateChip;
  sort: AdminSessionSort;
}

function matchesStateChip(
  phase: AdminSessionPhase,
  state: AdminSessionStateChip,
): boolean {
  if (state == null) {
    return true;
  }

  if (state === "hiding") {
    return phase === "hiding";
  }

  if (state === "seek") {
    return phase === "seek";
  }

  return phase === "end-game-pending" || phase === "end-game-active";
}

function compareBySort(
  left: AdminSessionSummary,
  right: AdminSessionSummary,
  sort: AdminSessionSort,
): number {
  if (sort === "created") {
    const leftCreated = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightCreated = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightCreated - leftCreated;
  }

  if (sort === "lastLocation") {
    const leftLocation = left.lastLocationAt ? Date.parse(left.lastLocationAt) : 0;
    const rightLocation = right.lastLocationAt
      ? Date.parse(right.lastLocationAt)
      : 0;
    if (rightLocation !== leftLocation) {
      return rightLocation - leftLocation;
    }
  }

  const leftActivity = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
  const rightActivity = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;
  if (rightActivity !== leftActivity) {
    return rightActivity - leftActivity;
  }

  const leftCreated = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightCreated = right.createdAt ? Date.parse(right.createdAt) : 0;
  return rightCreated - leftCreated;
}

export function filterAdminSessions(
  sessions: readonly AdminSessionSummary[],
  input: AdminSessionFilterInput,
): AdminSessionSummary[] {
  const normalizedQuery = input.query.trim().toLowerCase();

  const filtered = sessions.filter((summary) => {
    if (input.liveOnly && !summary.isLive) {
      return false;
    }

    if (input.mode !== "all" && summary.mode !== input.mode) {
      return false;
    }

    if (!matchesStateChip(summary.phase, input.state)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const areaLabel = resolveAdminSessionAreaLabel(summary)?.toLowerCase() ?? "";
    const hostVersion = summary.hostAppVersion?.toLowerCase() ?? "";
    return (
      summary.code.toLowerCase().includes(normalizedQuery) ||
      areaLabel.includes(normalizedQuery) ||
      hostVersion.includes(normalizedQuery)
    );
  });

  return filtered.toSorted((left, right) =>
    compareBySort(left, right, input.sort),
  );
}

export function summarizeAdminSessions(sessions: readonly AdminSessionSummary[]) {
  const byPhase: Record<AdminSessionPhase, number> = {
    waiting: 0,
    hiding: 0,
    seek: 0,
    "end-game-pending": 0,
    "end-game-active": 0,
  };

  let live = 0;
  let multiplayer = 0;

  for (const summary of sessions) {
    byPhase[summary.phase] += 1;
    if (summary.isLive) {
      live += 1;
    }
    if (summary.mode === "multiplayer") {
      multiplayer += 1;
    }
  }

  return {
    live,
    multiplayer,
    byPhase,
  };
}
