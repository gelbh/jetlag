/**
 * Free vs premium caps for the session-ops agent.
 * Server mirror: `functions/incident/sessionOpsCaps.mjs` — keep numbers in sync.
 *
 * Counters (server):
 * - `incidents/{id}.sessionOpsSummonCount`
 * - `incidents/{id}/summons/{summonId}.agentTurnCount`
 * - `incidents/{id}/summons/{summonId}.toolExecutionCount`
 * - global tool attempts: `_rateLimits` route `sessionOpsTool` (uid / hour)
 *
 * Destructive host confirms do not reset these counters.
 */

export type SessionOpsCapTier = "free" | "premium";

export interface SessionOpsCaps {
  summonsPerSession: number;
  agentTurnsPerSummon: number;
  toolExecutionsPerSummon: number;
  globalToolAttemptsPerUidPerHour: number;
}

export const SESSION_OPS_CAPS = {
  free: {
    summonsPerSession: 1,
    agentTurnsPerSummon: 12,
    toolExecutionsPerSummon: 6,
    globalToolAttemptsPerUidPerHour: 20,
  },
  premium: {
    summonsPerSession: 5,
    agentTurnsPerSummon: 40,
    toolExecutionsPerSummon: 25,
    globalToolAttemptsPerUidPerHour: 60,
  },
} as const satisfies Record<SessionOpsCapTier, SessionOpsCaps>;

/** Sliding / fixed window length for global tool attempts. */
export const SESSION_OPS_GLOBAL_TOOL_WINDOW_MS = 60 * 60 * 1000;

export const SESSION_OPS_SUMMON_CAP = "SESSION_OPS_SUMMON_CAP";
export const SESSION_OPS_TURN_CAP = "SESSION_OPS_TURN_CAP";
export const SESSION_OPS_TOOL_CAP = "SESSION_OPS_TOOL_CAP";
export const SESSION_OPS_GLOBAL_TOOL_CAP = "SESSION_OPS_GLOBAL_TOOL_CAP";

export type SessionOpsCapCode =
  | typeof SESSION_OPS_SUMMON_CAP
  | typeof SESSION_OPS_TURN_CAP
  | typeof SESSION_OPS_TOOL_CAP
  | typeof SESSION_OPS_GLOBAL_TOOL_CAP;

export interface SessionOpsIncidentUsage {
  summonCount: number;
}

export interface SessionOpsSummonUsage {
  agentTurnCount: number;
  toolExecutionCount: number;
}

export type CapConsumeResult<T> =
  | { ok: true; usage: T }
  | { ok: false; code: SessionOpsCapCode };

/**
 * Premium when the reporter has unlimited premium entitlement, or the
 * incident session is a premium-tier session.
 */
export function isSessionOpsPremiumTier(input: {
  hasUnlimitedPremium?: boolean;
  sessionTier?: string | null;
}): boolean {
  return (
    input.hasUnlimitedPremium === true || input.sessionTier === "premium"
  );
}

export function resolveSessionOpsCapTier(input: {
  hasUnlimitedPremium?: boolean;
  sessionTier?: string | null;
}): SessionOpsCapTier {
  return isSessionOpsPremiumTier(input) ? "premium" : "free";
}

export function getSessionOpsCaps(tier: SessionOpsCapTier): SessionOpsCaps {
  return SESSION_OPS_CAPS[tier];
}

function nonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export function readIncidentUsage(
  data: Record<string, unknown> | null | undefined,
): SessionOpsIncidentUsage {
  return {
    summonCount: nonNegativeInt(data?.sessionOpsSummonCount),
  };
}

export function readSummonUsage(
  data: Record<string, unknown> | null | undefined,
): SessionOpsSummonUsage {
  return {
    agentTurnCount: nonNegativeInt(data?.agentTurnCount),
    toolExecutionCount: nonNegativeInt(data?.toolExecutionCount),
  };
}

export function remainingSummons(
  usage: SessionOpsIncidentUsage,
  caps: SessionOpsCaps,
): number {
  return Math.max(0, caps.summonsPerSession - usage.summonCount);
}

export function remainingTurns(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): number {
  return Math.max(0, caps.agentTurnsPerSummon - usage.agentTurnCount);
}

export function remainingTools(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): number {
  return Math.max(0, caps.toolExecutionsPerSummon - usage.toolExecutionCount);
}

export function canSummon(
  usage: SessionOpsIncidentUsage,
  caps: SessionOpsCaps,
): boolean {
  return remainingSummons(usage, caps) > 0;
}

export function canConsumeTurn(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): boolean {
  return remainingTurns(usage, caps) > 0;
}

export function canConsumeTool(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): boolean {
  return remainingTools(usage, caps) > 0;
}

export function consumeSummon(
  usage: SessionOpsIncidentUsage,
  caps: SessionOpsCaps,
): CapConsumeResult<SessionOpsIncidentUsage> {
  if (!canSummon(usage, caps)) {
    return { ok: false, code: SESSION_OPS_SUMMON_CAP };
  }
  return { ok: true, usage: { summonCount: usage.summonCount + 1 } };
}

export function consumeTurn(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): CapConsumeResult<SessionOpsSummonUsage> {
  if (!canConsumeTurn(usage, caps)) {
    return { ok: false, code: SESSION_OPS_TURN_CAP };
  }
  return {
    ok: true,
    usage: {
      ...usage,
      agentTurnCount: usage.agentTurnCount + 1,
    },
  };
}

export function consumeTool(
  usage: SessionOpsSummonUsage,
  caps: SessionOpsCaps,
): CapConsumeResult<SessionOpsSummonUsage> {
  if (!canConsumeTool(usage, caps)) {
    return { ok: false, code: SESSION_OPS_TOOL_CAP };
  }
  return {
    ok: true,
    usage: {
      ...usage,
      toolExecutionCount: usage.toolExecutionCount + 1,
    },
  };
}
