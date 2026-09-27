/**
 * Callable entry for one session-ops support-agent turn (async Cursor Agents).
 *
 * Flow: authZ → caps → append user chat → ensure per-incident agent → enqueue
 * run → write working placeholder → return. Poller finalizes NL/tools.
 */

import { randomUUID } from "node:crypto";
import { INCIDENT_RATE_LIMITED } from "./createIncident.mjs";
import {
  INCIDENT_FORBIDDEN,
  INCIDENT_INVALID_MESSAGE,
  INCIDENT_NOT_FOUND,
} from "./postIncidentMessage.mjs";
import {
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_SUMMON_NOT_FOUND,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  consumeSessionOpsSummon,
  consumeSessionOpsTurn,
  resolveSessionOpsCapTier,
  resolveSessionOpsCaps,
} from "./sessionOpsCaps.mjs";
import { SESSION_OPS_TOOL_IDS } from "./sessionOpsTools.mjs";
import {
  buildDataMessages,
  buildPolicyMessages,
  buildSessionOpsAgentPrompt,
} from "./sessionOpsLlm.mjs";
import {
  SESSION_OPS_AGENT_BUSY,
  SESSION_OPS_AGENT_FAILED,
  SESSION_OPS_AGENT_MISCONFIGURED,
  createSessionOpsAgent,
  createSessionOpsRun,
} from "./sessionOpsCursorAgent.mjs";
import {
  SESSION_OPS_MCP_HEADER_ACTOR,
  SESSION_OPS_MCP_HEADER_INCIDENT,
  SESSION_OPS_MCP_HEADER_SESSION,
} from "./sessionOpsMcp.mjs";

export const SUPPORT_AGENT_TURN_ROUTE = "postSupportAgentTurn";
export const SUPPORT_AGENT_TURN_RATE_LIMIT = 20;
export const SUPPORT_AGENT_TURN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const SUPPORT_AGENT_MESSAGE_MAX_LENGTH = 2000;
export const SUPPORT_AGENT_WORKING_TEXT =
  "Working on your request… I will post an update here when ready.";

export const SUPPORT_AGENT_UNAUTHENTICATED = "SUPPORT_AGENT_UNAUTHENTICATED";
export const SUPPORT_AGENT_NO_SESSION = "SUPPORT_AGENT_NO_SESSION";
/** @deprecated Prefer SESSION_OPS_AGENT_FAILED after Cursor cutover. */
export const SESSION_OPS_LLM_FAILED = SESSION_OPS_AGENT_FAILED;

export {
  INCIDENT_FORBIDDEN as SUPPORT_AGENT_FORBIDDEN,
  INCIDENT_INVALID_MESSAGE as SUPPORT_AGENT_INVALID_MESSAGE,
  INCIDENT_NOT_FOUND as SUPPORT_AGENT_NOT_FOUND,
  INCIDENT_RATE_LIMITED as SUPPORT_AGENT_RATE_LIMITED,
  SESSION_OPS_AGENT_FAILED as SUPPORT_AGENT_LLM_FAILED,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_SUMMON_NOT_FOUND,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  SESSION_OPS_AGENT_BUSY,
  SESSION_OPS_AGENT_FAILED,
  SESSION_OPS_AGENT_MISCONFIGURED,
};

/**
 * @param db
 * @param input {{
 *   incidentId: string,
 *   uid: string,
 *   isAdmin?: boolean,
 *   text: string,
 *   summonId?: string | null,
 * }}
 * @param deps {{
 *   now?: () => Date,
 *   generateId?: () => string,
 *   rateLimit?: (options: object) => Promise<{ allowed: boolean }>,
 *   fetch?: typeof fetch,
 *   apiKey?: string,
 *   mcpUrl?: string,
 *   mcpAuthSecret?: string,
 *   createAgent?: typeof createSessionOpsAgent,
 *   createRun?: typeof createSessionOpsRun,
 *   consumeSummon?: typeof consumeSessionOpsSummon,
 *   consumeTurn?: typeof consumeSessionOpsTurn,
 *   resolveCaps?: typeof resolveSessionOpsCaps,
 *   loadEntitlements?: (uid: string) => Promise<object | null>,
 *   loadHistory?: (incidentId: string) => Promise<Array<object>>,
 *   appendSupportMessage?: (message: object) => Promise<{ messageId: string }>,
 * }}
 */
export async function supportAgentTurnHandler(db, input, deps = {}) {
  const uid = typeof input?.uid === "string" ? input.uid : "";
  if (!uid) {
    throw new Error(SUPPORT_AGENT_UNAUTHENTICATED);
  }

  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId : "";
  if (!incidentId) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const text = typeof input?.text === "string" ? input.text.trim() : "";
  if (text.length === 0 || text.length > SUPPORT_AGENT_MESSAGE_MAX_LENGTH) {
    throw new Error(INCIDENT_INVALID_MESSAGE);
  }

  const isAdmin = input?.isAdmin === true;
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());

  if (typeof deps.rateLimit === "function") {
    const rl = await deps.rateLimit({
      route: SUPPORT_AGENT_TURN_ROUTE,
      uid,
      limit: SUPPORT_AGENT_TURN_RATE_LIMIT,
      windowMs: SUPPORT_AGENT_TURN_RATE_LIMIT_WINDOW_MS,
    });
    if (!rl?.allowed) {
      throw new Error(INCIDENT_RATE_LIMITED);
    }
  }

  const incidentRef = db.collection("incidents").doc(incidentId);
  const incidentSnap = await incidentRef.get();
  if (!incidentSnap.exists) {
    throw new Error(INCIDENT_NOT_FOUND);
  }
  const incident = incidentSnap.data() ?? {};

  const policySessionId =
    typeof incident.sessionId === "string" ? incident.sessionId : "";
  if (!policySessionId) {
    throw new Error(SUPPORT_AGENT_NO_SESSION);
  }

  const existingRun = incident.supportAgentRun;
  if (
    existingRun &&
    typeof existingRun === "object" &&
    (existingRun.status === "working" || existingRun.status === "running")
  ) {
    throw new Error(SESSION_OPS_AGENT_BUSY);
  }

  const sessionSnap = await db.collection("sessions").doc(policySessionId).get();
  const session = sessionSnap.exists ? (sessionSnap.data() ?? {}) : {};
  const hostUid = typeof session.hostUid === "string" ? session.hostUid : "";
  const memberUids = Array.isArray(session.memberUids)
    ? session.memberUids
    : [];

  const isReporter = incident.reporterUid === uid;
  const isHost = hostUid === uid;
  const isMember = memberUids.includes(uid);
  if (!isAdmin && !isReporter && !isHost && !isMember) {
    throw new Error(INCIDENT_FORBIDDEN);
  }
  if (!isAdmin && !isReporter && !isHost) {
    throw new Error(INCIDENT_FORBIDDEN);
  }

  const loadEntitlements =
    deps.loadEntitlements ??
    (async (reporterUid) => {
      const snap = await db.collection("users").doc(reporterUid).get();
      return snap.exists ? (snap.data() ?? null) : null;
    });
  const entitlementsData = await loadEntitlements(
    typeof incident.reporterUid === "string" ? incident.reporterUid : uid,
  );
  const resolveCaps = deps.resolveCaps ?? resolveSessionOpsCaps;
  const capInput = {
    entitlementsData,
    sessionTier: typeof session.tier === "string" ? session.tier : null,
  };
  const caps = resolveCaps(capInput);
  const tier = resolveSessionOpsCapTier(capInput);

  const consumeSummon = deps.consumeSummon ?? consumeSessionOpsSummon;
  const consumeTurn = deps.consumeTurn ?? consumeSessionOpsTurn;

  let summonId =
    typeof input?.summonId === "string" && input.summonId
      ? input.summonId
      : typeof incident.activeSessionOpsSummonId === "string"
        ? incident.activeSessionOpsSummonId
        : "";

  if (!summonId) {
    summonId = generateId();
    const summoned = await consumeSummon(db, {
      incidentId,
      summonId,
      uid,
      caps,
      now,
    });
    if (!summoned.ok) {
      throw new Error(summoned.code ?? SESSION_OPS_SUMMON_CAP);
    }
    await incidentRef.set(
      { activeSessionOpsSummonId: summonId },
      { merge: true },
    );
  }

  const turned = await consumeTurn(db, { incidentId, summonId, caps });
  if (!turned.ok) {
    throw new Error(turned.code ?? SESSION_OPS_TURN_CAP);
  }

  const appendMessage =
    deps.appendSupportMessage ??
    ((message) => appendSupportThreadMessage(db, incidentId, message, generateId));

  await appendMessage({
    sender: isAdmin ? "admin" : "player",
    senderUid: uid,
    kind: "chat",
    text,
    visibility: "support",
    createdAt: now().toISOString(),
  });

  const loadHistory = deps.loadHistory ?? (async () => []);
  const history = await loadHistory(incidentId);

  const policyMessages = buildPolicyMessages({
    sessionId: policySessionId,
    incidentId,
    allowlist: SESSION_OPS_TOOL_IDS,
    role: "ops_agent",
    tier,
  });
  const dataMessages = buildDataMessages({
    userText: text,
    history,
    diagnostics: incident.diagnostics ?? null,
  });
  const promptText = buildSessionOpsAgentPrompt(policyMessages, dataMessages);

  const apiKey = typeof deps.apiKey === "string" ? deps.apiKey.trim() : "";
  const mcpUrl = typeof deps.mcpUrl === "string" ? deps.mcpUrl.trim() : "";
  const mcpAuthSecret =
    typeof deps.mcpAuthSecret === "string" ? deps.mcpAuthSecret.trim() : "";
  if (!apiKey || !mcpUrl || !mcpAuthSecret) {
    throw new Error(SESSION_OPS_AGENT_MISCONFIGURED);
  }

  const mcpAuthHeader = `Bearer ${mcpAuthSecret}`;
  const mcpExtraHeaders = {
    [SESSION_OPS_MCP_HEADER_INCIDENT]: incidentId,
    [SESSION_OPS_MCP_HEADER_SESSION]: policySessionId,
    [SESSION_OPS_MCP_HEADER_ACTOR]: uid,
  };

  const createAgent = deps.createAgent ?? createSessionOpsAgent;
  const createRun = deps.createRun ?? createSessionOpsRun;
  const fetchDeps = { fetch: deps.fetch };

  let agentId =
    typeof incident.cursorAgentId === "string" ? incident.cursorAgentId.trim() : "";
  let runId = null;
  let agentUrl = null;

  try {
    if (!agentId) {
      const created = await createAgent(
        {
          apiKey,
          promptText,
          mcpUrl,
          mcpAuthHeader,
          mcpExtraHeaders,
          name: `Incident ${incidentId.slice(0, 8)} session-ops`,
        },
        fetchDeps,
      );
      agentId = created.agentId;
      runId = created.runId;
      agentUrl = created.agentUrl;
    } else {
      const run = await createRun(
        {
          apiKey,
          agentId,
          promptText,
          mcpUrl,
          mcpAuthHeader,
          mcpExtraHeaders,
        },
        fetchDeps,
      );
      runId = run.runId;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === SESSION_OPS_AGENT_BUSY ||
        error.message === SESSION_OPS_AGENT_MISCONFIGURED ||
        error.message === SESSION_OPS_AGENT_FAILED)
    ) {
      throw error;
    }
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  if (!runId) {
    throw new Error(SESSION_OPS_AGENT_FAILED);
  }

  const working = await appendMessage({
    sender: "ops_agent",
    senderUid: null,
    kind: "status",
    text: SUPPORT_AGENT_WORKING_TEXT,
    visibility: "support",
    working: true,
    createdAt: now().toISOString(),
  });

  const nowIso = now().toISOString();
  await incidentRef.set(
    {
      cursorAgentId: agentId,
      ...(agentUrl ? { cursorAgentUrl: agentUrl } : {}),
      supportAgentRun: {
        runId,
        agentId,
        status: "working",
        startedAt: nowIso,
        workingMessageId: working?.messageId ?? null,
        summonId,
        actorUid: uid,
      },
      updatedAt: nowIso,
      ...(incident.status === "open" ? { status: "chatting" } : {}),
    },
    { merge: true },
  );

  return {
    summonId,
    runId,
    agentId,
    status: "working",
    workingMessageId: working?.messageId ?? null,
    assistantMessageId: null,
    content: null,
    toolOutcomes: [],
  };
}

/**
 * Minimal support-thread write.
 */
export async function appendSupportThreadMessage(
  db,
  incidentId,
  message,
  generateId = () => randomUUID(),
) {
  const messageId = generateId();
  const payload = {
    id: messageId,
    ...message,
  };

  const threadRef = db
    .collection("incidents")
    .doc(incidentId)
    .collection("threads")
    .doc("support")
    .collection("messages")
    .doc(messageId);

  await threadRef.set(payload);

  if (
    payload.sender === "ops_agent" ||
    payload.sender === "system" ||
    payload.kind === "chat"
  ) {
    await db
      .collection("incidents")
      .doc(incidentId)
      .collection("messages")
      .doc(messageId)
      .set({
        sender: payload.sender,
        senderUid: payload.senderUid ?? null,
        kind: payload.kind ?? "chat",
        text: payload.text ?? "",
        createdAt: payload.createdAt,
        toolCall: payload.toolCall ?? null,
        working: payload.working === true,
      });
  }

  return { messageId };
}
