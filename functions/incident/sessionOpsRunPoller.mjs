/**
 * Poll Cursor Cloud Agent runs for in-flight session-ops turns and persist
 * terminal NL to the support thread.
 */

import { randomUUID } from "node:crypto";
import { getSessionOpsRun } from "./sessionOpsCursorAgent.mjs";
import {
  SUPPORT_AGENT_WORKING_TEXT,
  appendSupportThreadMessage,
} from "./supportAgentTurn.mjs";

export const SESSION_OPS_RUN_TERMINAL = new Set([
  "FINISHED",
  "ERROR",
  "CANCELLED",
  "EXPIRED",
]);

export const SESSION_OPS_RUN_FAILURE_TEXT =
  "I could not finish that request. Please try again in a moment.";

/**
 * @param {unknown} status
 */
export function isSessionOpsRunTerminal(status) {
  return typeof status === "string" && SESSION_OPS_RUN_TERMINAL.has(status);
}

/**
 * Finalize one incident supportAgentRun if the Cursor run is terminal.
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

  const getRun = deps.getRun ?? getSessionOpsRun;
  const snapshot = await getRun(
    { apiKey, agentId, runId },
    { fetch: deps.fetch },
  );

  if (!isSessionOpsRunTerminal(snapshot.status)) {
    return { handled: false, reason: "still_running", status: snapshot.status };
  }

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const appendMessage =
    deps.appendSupportMessage ??
    ((message) =>
      appendSupportThreadMessage(db, incidentId, message, generateId));

  const succeeded = snapshot.status === "FINISHED";
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
    runStatus: snapshot.status,
  });

  const workingMessageId =
    typeof run.workingMessageId === "string" ? run.workingMessageId : "";
  if (workingMessageId) {
    try {
      await db
        .collection("incidents")
        .doc(incidentId)
        .collection("threads")
        .doc("support")
        .collection("messages")
        .doc(workingMessageId)
        .set(
          {
            working: false,
            superseded: true,
            text: SUPPORT_AGENT_WORKING_TEXT,
          },
          { merge: true },
        );
    } catch {
      // Best-effort clear of working flag.
    }
  }

  await db
    .collection("incidents")
    .doc(incidentId)
    .set(
      {
        supportAgentRun: {
          ...run,
          status: succeeded ? "finished" : "failed",
          finishedAt: now().toISOString(),
          terminalStatus: snapshot.status,
          assistantMessageId: appended?.messageId ?? null,
        },
        updatedAt: now().toISOString(),
      },
      { merge: true },
    );

  return {
    handled: true,
    status: snapshot.status,
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
    const result = await finalizeSessionOpsRunIfReady(
      db,
      entry.id,
      entry.data,
      deps,
    );
    results.push({ incidentId: entry.id, ...result });
  }
  return results;
}
