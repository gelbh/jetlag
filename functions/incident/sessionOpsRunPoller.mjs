/**
 * Poll Cursor Cloud Agent runs for in-flight session-ops turns and persist
 * terminal NL to the support thread.
 */

import { randomUUID } from "node:crypto";
import { getSessionOpsRun } from "./sessionOpsCursorAgent.mjs";
import {
  SUPPORT_AGENT_WORKING_TEXT,
  appendSupportThreadMessage,
} from "./sessionOpsThread.mjs";

export const SESSION_OPS_RUN_TERMINAL = new Set([
  "FINISHED",
  "ERROR",
  "CANCELLED",
  "EXPIRED",
]);

export const SESSION_OPS_RUN_FAILURE_TEXT =
  "I could not finish that request. Please try again in a moment.";

/** Release stuck working runs after this age (default 15 minutes). */
export const SESSION_OPS_RUN_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * @param {unknown} status
 */
export function isSessionOpsRunTerminal(status) {
  return typeof status === "string" && SESSION_OPS_RUN_TERMINAL.has(status);
}

/**
 * @param {object} run
 * @param {() => Date} now
 * @param {number} maxAgeMs
 */
export function isSessionOpsRunExpired(run, now, maxAgeMs = SESSION_OPS_RUN_MAX_AGE_MS) {
  const startedAt =
    typeof run?.startedAt === "string" ? Date.parse(run.startedAt) : NaN;
  if (Number.isNaN(startedAt)) {
    return false;
  }
  return now().getTime() - startedAt >= maxAgeMs;
}

/**
 * Transactionally claim an active run for finalize (working|running → finalizing).
 * Refuses if runId no longer matches or status is no longer active.
 *
 * @param db
 * @param {string} incidentId
 * @param {string} runId
 * @param {() => Date} now
 * @param {{ runTransaction?: Function }} [deps]
 */
export async function claimSessionOpsRunFinalize(
  db,
  incidentId,
  runId,
  now,
  deps = {},
) {
  const runTransaction =
    deps.runTransaction ?? ((fn) => db.runTransaction(fn));
  const ref = db.collection("incidents").doc(incidentId);

  return runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      return { ok: false, reason: "missing_incident" };
    }
    const data = snap.data() ?? {};
    const run =
      data.supportAgentRun && typeof data.supportAgentRun === "object"
        ? data.supportAgentRun
        : null;
    if (!run) {
      return { ok: false, reason: "no_run" };
    }
    if (typeof run.runId !== "string" || run.runId !== runId) {
      return { ok: false, reason: "stale_run" };
    }
    const status = typeof run.status === "string" ? run.status : "";
    if (status !== "working" && status !== "running") {
      return { ok: false, reason: "not_active", status };
    }
    const nextRun = {
      ...run,
      status: "finalizing",
      claimedAt: now().toISOString(),
    };
    transaction.set(
      ref,
      {
        supportAgentRun: nextRun,
        updatedAt: now().toISOString(),
      },
      { merge: true },
    );
    return { ok: true, run: nextRun, incident: data };
  });
}

/**
 * @param db
 * @param {string} incidentId
 * @param {string} workingMessageId
 * @param {string} text
 */
async function clearWorkingPlaceholder(db, incidentId, workingMessageId, text) {
  if (!workingMessageId) {
    return;
  }
  const patch = {
    working: false,
    superseded: true,
    text,
  };
  try {
    await db
      .collection("incidents")
      .doc(incidentId)
      .collection("threads")
      .doc("support")
      .collection("messages")
      .doc(workingMessageId)
      .set(patch, { merge: true });
  } catch {
    // Best-effort.
  }
  try {
    await db
      .collection("incidents")
      .doc(incidentId)
      .collection("messages")
      .doc(workingMessageId)
      .set(patch, { merge: true });
  } catch {
    // Desk mirror may be absent.
  }
}

/**
 * Finalize one incident supportAgentRun if the Cursor run is terminal (or aged out).
 *
 * @param db
 * @param incidentId {string}
 * @param incident {Record<string, unknown>}
 * @param deps {{
 *   apiKey: string,
 *   getRun?: typeof getSessionOpsRun,
 *   fetch?: typeof fetch,
 *   now?: () => Date,
 *   generateId?: () => string,
 *   appendSupportMessage?: Function,
 *   runTransaction?: Function,
 *   maxAgeMs?: number,
 * }}
 */
export async function finalizeSessionOpsRunIfReady(
  db,
  incidentId,
  incident,
  deps,
) {
  const run =
    incident?.supportAgentRun && typeof incident.supportAgentRun === "object"
      ? incident.supportAgentRun
      : null;
  if (!run) {
    return { handled: false, reason: "no_run" };
  }
  const status = typeof run.status === "string" ? run.status : "";
  if (status !== "working" && status !== "running") {
    return { handled: false, reason: "not_active" };
  }

  const agentId =
    typeof run.agentId === "string" && run.agentId
      ? run.agentId
      : typeof incident.cursorAgentId === "string"
        ? incident.cursorAgentId
        : "";
  const runId = typeof run.runId === "string" ? run.runId : "";
  const apiKey = typeof deps.apiKey === "string" ? deps.apiKey.trim() : "";
  if (!agentId || !runId || !apiKey) {
    return { handled: false, reason: "misconfigured" };
  }

  const now = deps.now ?? (() => new Date());
  const maxAgeMs =
    typeof deps.maxAgeMs === "number" && deps.maxAgeMs > 0
      ? deps.maxAgeMs
      : SESSION_OPS_RUN_MAX_AGE_MS;
  const agedOut = isSessionOpsRunExpired(run, now, maxAgeMs);

  const getRun = deps.getRun ?? getSessionOpsRun;
  let snapshot = { status: "RUNNING", text: null };
  try {
    snapshot = await getRun(
      { apiKey, agentId, runId },
      { fetch: deps.fetch },
    );
  } catch (error) {
    if (!agedOut) {
      throw error;
    }
    snapshot = { status: "ERROR", text: null };
  }

  if (!isSessionOpsRunTerminal(snapshot.status) && !agedOut) {
    return { handled: false, reason: "still_running", status: snapshot.status };
  }

  const claimed = await claimSessionOpsRunFinalize(
    db,
    incidentId,
    runId,
    now,
    deps,
  );
  if (!claimed.ok) {
    return { handled: false, reason: claimed.reason ?? "claim_failed" };
  }

  const claimedRun = claimed.run;
  const generateId = deps.generateId ?? (() => randomUUID());
  const appendMessage =
    deps.appendSupportMessage ??
    ((message) =>
      appendSupportThreadMessage(db, incidentId, message, generateId));

  const succeeded = snapshot.status === "FINISHED" && !agedOut;
  const assistantText =
    succeeded && typeof snapshot.text === "string" && snapshot.text.trim()
      ? snapshot.text.trim()
      : SESSION_OPS_RUN_FAILURE_TEXT;

  const kind = assistantText.includes("?") ? "question" : "status";
  const appended = await appendMessage({
    sender: "ops_agent",
    senderUid: null,
    kind,
    text: assistantText,
    visibility: "support",
    working: false,
    createdAt: now().toISOString(),
    runId,
    runStatus: agedOut ? "EXPIRED" : snapshot.status,
  });

  const workingMessageId =
    typeof claimedRun.workingMessageId === "string"
      ? claimedRun.workingMessageId
      : "";
  await clearWorkingPlaceholder(
    db,
    incidentId,
    workingMessageId,
    SUPPORT_AGENT_WORKING_TEXT,
  );

  // Re-check runId so we never merge finished over a newer active run.
  const freshSnap = await db.collection("incidents").doc(incidentId).get();
  const fresh = freshSnap.exists ? (freshSnap.data() ?? {}) : {};
  const freshRun =
    fresh.supportAgentRun && typeof fresh.supportAgentRun === "object"
      ? fresh.supportAgentRun
      : null;
  if (
    !freshRun ||
    typeof freshRun.runId !== "string" ||
    freshRun.runId !== runId ||
    freshRun.status !== "finalizing"
  ) {
    return {
      handled: false,
      reason: "stale_run",
      assistantMessageId: appended?.messageId ?? null,
    };
  }

  await db
    .collection("incidents")
    .doc(incidentId)
    .set(
      {
        supportAgentRun: {
          ...claimedRun,
          status: succeeded ? "finished" : "failed",
          finishedAt: now().toISOString(),
          terminalStatus: agedOut ? "EXPIRED" : snapshot.status,
          assistantMessageId: appended?.messageId ?? null,
        },
        updatedAt: now().toISOString(),
      },
      { merge: true },
    );

  return {
    handled: true,
    status: agedOut ? "EXPIRED" : snapshot.status,
    assistantMessageId: appended?.messageId ?? null,
  };
}

/**
 * Query active session-ops runs and finalize those that are terminal.
 *
 * @param db
 * @param deps {{
 *   apiKey: string,
 *   listActiveIncidents?: () => Promise<Array<{ id: string, data: object }>>,
 *   getRun?: typeof getSessionOpsRun,
 *   fetch?: typeof fetch,
 *   now?: () => Date,
 *   generateId?: () => string,
 *   runTransaction?: Function,
 *   maxAgeMs?: number,
 * }}
 */
export async function pollSessionOpsRuns(db, deps) {
  const listActiveIncidents =
    deps.listActiveIncidents ??
    (async () => {
      const snap = await db
        .collection("incidents")
        .where("supportAgentRun.status", "in", ["working", "running"])
        .limit(50)
        .get();
      return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
    });

  const incidents = await listActiveIncidents();
  /** @type {Array<object>} */
  const results = [];
  for (const entry of incidents) {
    try {
      const result = await finalizeSessionOpsRunIfReady(
        db,
        entry.id,
        entry.data,
        deps,
      );
      results.push({ incidentId: entry.id, ...result });
    } catch (error) {
      results.push({
        incidentId: entry.id,
        handled: false,
        reason: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
