/**
 * Server mirror of src/domain/incident/sessionOpsCaps.ts.
 * Keep free/premium numbers and error codes in sync.
 *
 * Counters:
 * - incidents/{id}.sessionOpsSummonCount
 * - incidents/{id}/summons/{summonId}.agentTurnCount
 * - incidents/{id}/summons/{summonId}.toolExecutionCount
 * - global tool attempts: _rateLimits route sessionOpsTool (uid / hour)
 *
 * Destructive host confirms do not reset these counters.
 */

import { hasUnlimitedPremiumEntitlement } from "../billing/premiumEntitlements.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";

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
};

export const SESSION_OPS_GLOBAL_TOOL_WINDOW_MS = 60 * 60 * 1000;
export const SESSION_OPS_GLOBAL_TOOL_RATE_ROUTE = "sessionOpsTool";

export const SESSION_OPS_SUMMON_CAP = "SESSION_OPS_SUMMON_CAP";
export const SESSION_OPS_TURN_CAP = "SESSION_OPS_TURN_CAP";
export const SESSION_OPS_TOOL_CAP = "SESSION_OPS_TOOL_CAP";
export const SESSION_OPS_GLOBAL_TOOL_CAP = "SESSION_OPS_GLOBAL_TOOL_CAP";
export const SESSION_OPS_SUMMON_NOT_FOUND = "SESSION_OPS_SUMMON_NOT_FOUND";

/**
 * Premium when reporter has unlimited premium entitlement, or the session
 * is tier === "premium". Prefer passing both.
 *
 * @param input {{ entitlementsData?: Record<string, unknown>, sessionTier?: string | null }}
 */
export function isSessionOpsPremium(input = {}) {
  return (
    hasUnlimitedPremiumEntitlement(input.entitlementsData) ||
    input.sessionTier === "premium"
  );
}

/**
 * @param input {{ entitlementsData?: Record<string, unknown>, sessionTier?: string | null }}
 * @returns {"free" | "premium"}
 */
export function resolveSessionOpsCapTier(input = {}) {
  return isSessionOpsPremium(input) ? "premium" : "free";
}

/**
 * @param {"free" | "premium"} tier
 */
export function getSessionOpsCaps(tier) {
  return SESSION_OPS_CAPS[tier] ?? SESSION_OPS_CAPS.free;
}

/**
 * @param input {{ entitlementsData?: Record<string, unknown>, sessionTier?: string | null }}
 */
export function resolveSessionOpsCaps(input = {}) {
  return getSessionOpsCaps(resolveSessionOpsCapTier(input));
}

function nonNegativeInt(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

export function readIncidentUsage(data) {
  return { summonCount: nonNegativeInt(data?.sessionOpsSummonCount) };
}

export function readSummonUsage(data) {
  return {
    agentTurnCount: nonNegativeInt(data?.agentTurnCount),
    toolExecutionCount: nonNegativeInt(data?.toolExecutionCount),
  };
}

export function canSummon(usage, caps) {
  return usage.summonCount < caps.summonsPerSession;
}

export function canConsumeTurn(usage, caps) {
  return usage.agentTurnCount < caps.agentTurnsPerSummon;
}

export function canConsumeTool(usage, caps) {
  return usage.toolExecutionCount < caps.toolExecutionsPerSummon;
}

/**
 * Pure consume-on-summon (in-memory). Prefer Firestore helpers for enforcement.
 */
export function consumeSummon(usage, caps) {
  if (!canSummon(usage, caps)) {
    return { ok: false, code: SESSION_OPS_SUMMON_CAP };
  }
  return { ok: true, usage: { summonCount: usage.summonCount + 1 } };
}

/**
 * Pure consume-on-turn.
 */
export function consumeTurn(usage, caps) {
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

/**
 * Pure consume-on-tool (per-summon only; global is separate).
 */
export function consumeTool(usage, caps) {
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

/**
 * Create a summon and increment incident summon count.
 *
 * @param db Firestore admin (or compatible mock)
 * @param input {{ incidentId, summonId, uid, caps, now? }}
 */
export async function consumeSessionOpsSummon(db, input) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const summonId = typeof input?.summonId === "string" ? input.summonId : "";
  const uid = typeof input?.uid === "string" ? input.uid : "";
  const caps = input?.caps ?? SESSION_OPS_CAPS.free;
  const now = input?.now ?? (() => new Date());

  if (!incidentId || !summonId) {
    return { ok: false, code: SESSION_OPS_SUMMON_CAP };
  }

  const incidentRef = db.collection("incidents").doc(incidentId);
  const summonRef = incidentRef.collection("summons").doc(summonId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(incidentRef);
    const usage = readIncidentUsage(snap.exists ? snap.data() : {});
    const next = consumeSummon(usage, caps);
    if (!next.ok) {
      return next;
    }

    const createdAt = now().toISOString();
    transaction.set(
      incidentRef,
      { sessionOpsSummonCount: next.usage.summonCount },
      { merge: true },
    );
    transaction.set(summonRef, {
      uid,
      agentTurnCount: 0,
      toolExecutionCount: 0,
      createdAt,
    });

    return {
      ok: true,
      usage: next.usage,
      summonId,
      createdAt,
    };
  });
}

/**
 * Consume one agent turn on a summon doc.
 *
 * @param db Firestore admin (or compatible mock)
 * @param input {{ incidentId, summonId, caps }}
 */
export async function consumeSessionOpsTurn(db, input) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const summonId = typeof input?.summonId === "string" ? input.summonId : "";
  const caps = input?.caps ?? SESSION_OPS_CAPS.free;

  if (!incidentId || !summonId) {
    return { ok: false, code: SESSION_OPS_SUMMON_NOT_FOUND };
  }

  const summonRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("summons")
    .doc(summonId);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(summonRef);
    if (!snap.exists) {
      return { ok: false, code: SESSION_OPS_SUMMON_NOT_FOUND };
    }

    const usage = readSummonUsage(snap.data());
    const next = consumeTurn(usage, caps);
    if (!next.ok) {
      return next;
    }

    transaction.set(
      summonRef,
      { agentTurnCount: next.usage.agentTurnCount },
      { merge: true },
    );

    return { ok: true, usage: next.usage };
  });
}

/**
 * Consume one tool execution on the summon + one global uid/hour attempt.
 * Host confirm approval must call this again for the real execution — it does
 * not reset counters.
 *
 * @param db Firestore admin (or compatible mock)
 * @param input {{ incidentId, summonId, uid, caps, nowMs? }}
 * @param deps {{ consumeGlobalToolAttempt? }}
 */
export async function consumeSessionOpsTool(db, input, deps = {}) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  const summonId = typeof input?.summonId === "string" ? input.summonId : "";
  const uid = typeof input?.uid === "string" ? input.uid : "";
  const caps = input?.caps ?? SESSION_OPS_CAPS.free;
  const nowMs =
    typeof input?.nowMs === "number" && Number.isFinite(input.nowMs)
      ? input.nowMs
      : Date.now();

  if (!incidentId || !summonId) {
    return { ok: false, code: SESSION_OPS_SUMMON_NOT_FOUND };
  }

  const summonRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("summons")
    .doc(summonId);

  const local = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(summonRef);
    if (!snap.exists) {
      return { ok: false, code: SESSION_OPS_SUMMON_NOT_FOUND };
    }

    const usage = readSummonUsage(snap.data());
    const next = consumeTool(usage, caps);
    if (!next.ok) {
      return next;
    }

    transaction.set(
      summonRef,
      { toolExecutionCount: next.usage.toolExecutionCount },
      { merge: true },
    );

    return { ok: true, usage: next.usage };
  });

  if (!local.ok) {
    return local;
  }

  const consumeGlobal =
    deps.consumeGlobalToolAttempt ??
    ((options) =>
      consumeRateLimit(db, {
        route: SESSION_OPS_GLOBAL_TOOL_RATE_ROUTE,
        uid: options.uid,
        limit: options.limit,
        windowMs: SESSION_OPS_GLOBAL_TOOL_WINDOW_MS,
        nowMs: options.nowMs,
      }));

  const global = await consumeGlobal({
    uid,
    limit: caps.globalToolAttemptsPerUidPerHour,
    nowMs,
  });

  if (!global.allowed) {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(summonRef);
      if (!snap.exists) {
        return;
      }
      const usage = readSummonUsage(snap.data());
      const rolledBack = Math.max(0, usage.toolExecutionCount - 1);
      transaction.set(
        summonRef,
        { toolExecutionCount: rolledBack },
        { merge: true },
      );
    });

    return {
      ok: false,
      code: SESSION_OPS_GLOBAL_TOOL_CAP,
      retryAfterMs: global.retryAfterMs ?? 0,
    };
  }

  return { ok: true, usage: local.usage };
}
