import type { StandoffTeamId } from "./standoffTurn";

/** Dusk closer-guess award (Phase 5 scoreDuskGuesses); Siege consumes it here. */
export const DUSK_HEAD_START_SECONDS = 15 * 60;

export type SiegeRole = "attack" | "defend";

export type SiegeTeamRoles = {
  teamA: SiegeRole;
  teamB: SiegeRole;
};

/** Pause reasons; geofence/travel hard-pause; dispute from capture. */
export type SiegePauseReason = "safetyStop" | "geofence" | "travel" | "dispute";

/**
 * Endgame that opens Siege. `headStart` must already carry seconds from
 * `scoreDuskGuesses` (or DUSK_HEAD_START_SECONDS); createSiegeClocks bakes them in.
 */
export type SiegeEndgameStart =
  | { kind: "dualSiege" }
  | { kind: "headStart"; teamId: StandoffTeamId; headStartSeconds: number }
  | { kind: "standard"; attackingTeam: StandoffTeamId };

export type SiegeClockState = {
  limitSeconds: number;
  deadlineMs: number;
  paused: boolean;
  pauseReason: SiegePauseReason | null;
  remainingMsWhenPaused: number | null;
  roles: SiegeTeamRoles;
  headStartTeamId: StandoffTeamId | null;
  /** Wall time when trailing team may attack; null when no stagger. */
  headStartEndsAtMs: number | null;
  /** Always true after create: Dusk flag is baked into deadlines/roles. */
  headStartConsumed: true;
};

function rolesForEndgame(endgame: SiegeEndgameStart): SiegeTeamRoles {
  switch (endgame.kind) {
    case "dualSiege":
      return { teamA: "attack", teamB: "attack" };
    case "headStart":
      return endgame.teamId === "teamA"
        ? { teamA: "attack", teamB: "defend" }
        : { teamA: "defend", teamB: "attack" };
    case "standard":
      return endgame.attackingTeam === "teamA"
        ? { teamA: "attack", teamB: "defend" }
        : { teamA: "defend", teamB: "attack" };
    default: {
      const _exhaustive: never = endgame;
      return _exhaustive;
    }
  }
}

/** Open Siege clocks from Standoff endgame; consumes Dusk head-start into state. */
export function createSiegeClocks(opts: {
  nowMs: number;
  limitSeconds: number;
  endgame: SiegeEndgameStart;
}): SiegeClockState {
  const limitSeconds =
    Number.isFinite(opts.limitSeconds) && opts.limitSeconds > 0
      ? Math.round(opts.limitSeconds)
      : 90 * 60;
  const roles = rolesForEndgame(opts.endgame);

  if (opts.endgame.kind === "headStart") {
    const headStartSeconds =
      Number.isFinite(opts.endgame.headStartSeconds) && opts.endgame.headStartSeconds > 0
        ? Math.round(opts.endgame.headStartSeconds)
        : DUSK_HEAD_START_SECONDS;
    return {
      limitSeconds,
      deadlineMs: opts.nowMs + (headStartSeconds + limitSeconds) * 1000,
      paused: false,
      pauseReason: null,
      remainingMsWhenPaused: null,
      roles,
      headStartTeamId: opts.endgame.teamId,
      headStartEndsAtMs: opts.nowMs + headStartSeconds * 1000,
      headStartConsumed: true,
    };
  }

  return {
    limitSeconds,
    deadlineMs: opts.nowMs + limitSeconds * 1000,
    paused: false,
    pauseReason: null,
    remainingMsWhenPaused: null,
    roles,
    headStartTeamId: null,
    headStartEndsAtMs: null,
    headStartConsumed: true,
  };
}

export function remainingSiegeMs(clock: SiegeClockState, nowMs: number): number {
  if (clock.paused) {
    return Math.max(0, clock.remainingMsWhenPaused ?? 0);
  }
  return Math.max(0, clock.deadlineMs - nowMs);
}

export function pauseSiegeClock(
  clock: SiegeClockState,
  nowMs: number,
  reason: SiegePauseReason,
): SiegeClockState {
  if (clock.paused) {
    return clock;
  }
  return {
    ...clock,
    paused: true,
    pauseReason: reason,
    remainingMsWhenPaused: remainingSiegeMs(clock, nowMs),
  };
}

export function resumeSiegeClock(clock: SiegeClockState, nowMs: number): SiegeClockState {
  if (!clock.paused) {
    return clock;
  }
  const remaining = Math.max(0, clock.remainingMsWhenPaused ?? 0);
  return {
    ...clock,
    paused: false,
    pauseReason: null,
    remainingMsWhenPaused: null,
    deadlineMs: nowMs + remaining,
  };
}
