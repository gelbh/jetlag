import {
  createSiegeClocks,
  type SiegeClockState,
  type SiegeEndgameStart,
  type SiegePauseReason,
  type SiegeRole,
} from "./siegeClocks";
import type { StandoffTeamId } from "./standoffTurn";

const ROLES = new Set<SiegeRole>(["attack", "defend"]);
const PAUSE_REASONS = new Set<SiegePauseReason>(["safetyStop", "geofence", "travel"]);
const TEAMS = new Set<StandoffTeamId>(["teamA", "teamB"]);

export function serializeSiegeClock(clock: SiegeClockState): Record<string, unknown> {
  return {
    limitSeconds: clock.limitSeconds,
    deadlineMs: clock.deadlineMs,
    paused: clock.paused,
    pauseReason: clock.pauseReason,
    remainingMsWhenPaused: clock.remainingMsWhenPaused,
    captureBlocked: clock.captureBlocked,
    roles: clock.roles,
    headStartTeamId: clock.headStartTeamId,
    headStartEndsAtMs: clock.headStartEndsAtMs,
    headStartConsumed: true,
  };
}

export function deserializeSiegeClock(value: unknown): SiegeClockState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.limitSeconds !== "number" ||
    typeof record.deadlineMs !== "number" ||
    typeof record.paused !== "boolean" ||
    record.headStartConsumed !== true
  ) {
    return undefined;
  }

  const rolesRaw = record.roles;
  if (!rolesRaw || typeof rolesRaw !== "object" || Array.isArray(rolesRaw)) {
    return undefined;
  }
  const rolesMap = rolesRaw as Record<string, unknown>;
  if (
    typeof rolesMap.teamA !== "string" ||
    typeof rolesMap.teamB !== "string" ||
    !ROLES.has(rolesMap.teamA as SiegeRole) ||
    !ROLES.has(rolesMap.teamB as SiegeRole)
  ) {
    return undefined;
  }

  const pauseReason =
    record.pauseReason === null || record.pauseReason === undefined
      ? null
      : typeof record.pauseReason === "string" &&
          PAUSE_REASONS.has(record.pauseReason as SiegePauseReason)
        ? (record.pauseReason as SiegePauseReason)
        : null;

  const headStartTeamId =
    record.headStartTeamId === null || record.headStartTeamId === undefined
      ? null
      : typeof record.headStartTeamId === "string" &&
          TEAMS.has(record.headStartTeamId as StandoffTeamId)
        ? (record.headStartTeamId as StandoffTeamId)
        : null;

  const remainingMsWhenPaused =
    record.remainingMsWhenPaused === null || record.remainingMsWhenPaused === undefined
      ? null
      : typeof record.remainingMsWhenPaused === "number"
        ? record.remainingMsWhenPaused
        : null;

  const headStartEndsAtMs =
    record.headStartEndsAtMs === null || record.headStartEndsAtMs === undefined
      ? null
      : typeof record.headStartEndsAtMs === "number"
        ? record.headStartEndsAtMs
        : null;

  return {
    limitSeconds: record.limitSeconds,
    deadlineMs: record.deadlineMs,
    paused: record.paused,
    pauseReason,
    remainingMsWhenPaused,
    captureBlocked: record.captureBlocked === true || record.paused === true,
    roles: {
      teamA: rolesMap.teamA as SiegeRole,
      teamB: rolesMap.teamB as SiegeRole,
    },
    headStartTeamId,
    headStartEndsAtMs,
    headStartConsumed: true,
  };
}

/** Public session fields when host opens Siege (Dusk/Dual/standard endgame). */
export function buildStartSiegePublicPatch(opts: {
  nowMs: number;
  limitSeconds: number;
  endgame: SiegeEndgameStart;
}): {
  phase: "siege";
  siegeClock: Record<string, unknown>;
} {
  const clock = createSiegeClocks(opts);
  return {
    phase: "siege",
    siegeClock: serializeSiegeClock(clock),
  };
}
