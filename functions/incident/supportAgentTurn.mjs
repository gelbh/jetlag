/**
 * Callable entry for one session-ops support-agent turn.
 *
 * Flow: authZ → load incident → consume turn (caps) → dual-channel LLM →
 * validate/execute each tool with **policy** sessionId → persist NL.
 *
 * Dual-channel: user NL never enters policy strings; tool execution always
 * binds `sessionId` from the incident, ignoring model/user-supplied ids.
 */

import { randomUUID } from "node:crypto";
import { INCIDENT_RATE_LIMITED } from "./createIncident.mjs";
import { requestHostConfirm } from "./hostConfirm.mjs";
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
  consumeSessionOpsTool,
  consumeSessionOpsTurn,
  resolveSessionOpsCapTier,
  resolveSessionOpsCaps,
} from "./sessionOpsCaps.mjs";
import { executeSessionOpsTool } from "./sessionOpsExecute.mjs";
import {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_UNKNOWN_TOOL,
  validateSessionOpsTool,
} from "./sessionOpsValidate.mjs";
import { SESSION_OPS_TOOL_IDS } from "./sessionOpsTools.mjs";
import {
  SESSION_OPS_LLM_FAILED,
  buildDataMessages,
  buildPolicyMessages,
  buildSessionOpsOpenAiTools,
  callSessionOpsLlm,
} from "./sessionOpsLlm.mjs";

export const SUPPORT_AGENT_TURN_ROUTE = "postSupportAgentTurn";
export const SUPPORT_AGENT_TURN_RATE_LIMIT = 20;
export const SUPPORT_AGENT_TURN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const SUPPORT_AGENT_MESSAGE_MAX_LENGTH = 2000;

export const SUPPORT_AGENT_UNAUTHENTICATED = "SUPPORT_AGENT_UNAUTHENTICATED";
export const SUPPORT_AGENT_NO_SESSION = "SUPPORT_AGENT_NO_SESSION";
export {
  INCIDENT_FORBIDDEN as SUPPORT_AGENT_FORBIDDEN,
  INCIDENT_INVALID_MESSAGE as SUPPORT_AGENT_INVALID_MESSAGE,
  INCIDENT_NOT_FOUND as SUPPORT_AGENT_NOT_FOUND,
  INCIDENT_RATE_LIMITED as SUPPORT_AGENT_RATE_LIMITED,
  SESSION_OPS_LLM_FAILED as SUPPORT_AGENT_LLM_FAILED,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_SUMMON_NOT_FOUND,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  SESSION_OPS_GLOBAL_TOOL_CAP,
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
 *   llmBaseUrl?: string,
 *   llmModel?: string,
 *   callLlm?: typeof callSessionOpsLlm,
 *   execute?: typeof executeSessionOpsTool,
 *   requestConfirm?: typeof requestHostConfirm,
 *   consumeSummon?: typeof consumeSessionOpsSummon,
 *   consumeTurn?: typeof consumeSessionOpsTurn,
 *   consumeTool?: typeof consumeSessionOpsTool,
 *   resolveCaps?: typeof resolveSessionOpsCaps,
 *   loadEntitlements?: (uid: string) => Promise<object | null>,
 *   loadHistory?: (incidentId: string) => Promise<Array<object>>,
 *   appendSupportMessage?: (message: object) => Promise<{ messageId: string }>,
 *   executeDeps?: object,
 *   notifyHostConfirm?: Function,
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
  // Summon/chat: reporter, host, or admin (members may read; write = same set).
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
  const consumeTool = deps.consumeTool ?? consumeSessionOpsTool;

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

  const callLlm = deps.callLlm ?? callSessionOpsLlm;
  const apiKey = typeof deps.apiKey === "string" ? deps.apiKey : "";
  let llmResult;
  try {
    llmResult = await callLlm(
      {
        apiKey,
        policyMessages,
        dataMessages,
        tools: buildSessionOpsOpenAiTools(SESSION_OPS_TOOL_IDS),
        baseUrl: deps.llmBaseUrl,
        model: deps.llmModel,
      },
      { fetch: deps.fetch },
    );
  } catch (error) {
    if (error instanceof Error && error.message === SESSION_OPS_LLM_FAILED) {
      throw error;
    }
    throw new Error(SESSION_OPS_LLM_FAILED);
  }

  const execute = deps.execute ?? executeSessionOpsTool;
  const requestConfirm = deps.requestConfirm ?? requestHostConfirm;

  /** @type {Array<object>} */
  const toolOutcomes = [];

  for (const toolCall of llmResult.toolCalls ?? []) {
    const outcome = await runValidatedToolCall(db, {
      incidentId,
      policySessionId,
      actorUid: uid,
      summonId,
      caps,
      toolCall,
      execute,
      requestConfirm,
      consumeTool,
      notify: deps.notifyHostConfirm,
      executeDeps: deps.executeDeps,
      now,
      generateId,
    });
    toolOutcomes.push(outcome);

    await appendMessage({
      sender: "system",
      senderUid: null,
      kind: outcome.status === "host_confirm_required" ? "host_confirm" : "tool_result",
      text: formatToolOutcomeText(outcome),
      visibility: "support",
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        args: toolCall.args,
        status: outcome.status,
        code: outcome.code ?? null,
        confirmId: outcome.confirmId ?? null,
      },
      createdAt: now().toISOString(),
    });
  }

  const assistantText =
    typeof llmResult.content === "string" && llmResult.content.trim()
      ? llmResult.content.trim()
      : defaultAssistantText(toolOutcomes);

  let assistantMessageId = null;
  if (assistantText) {
    const kind = looksLikeQuestion(assistantText) ? "question" : "status";
    const appended = await appendMessage({
      sender: "ops_agent",
      senderUid: null,
      kind,
      text: assistantText,
      visibility: "support",
      createdAt: now().toISOString(),
    });
    assistantMessageId = appended?.messageId ?? null;
  }

  await incidentRef.set(
    {
      updatedAt: now().toISOString(),
      ...(incident.status === "open" ? { status: "chatting" } : {}),
    },
    { merge: true },
  );

  return {
    summonId,
    assistantMessageId,
    content: assistantText,
    toolOutcomes,
  };
}

async function runValidatedToolCall(db, ctx) {
  const { toolCall, policySessionId, incidentId, actorUid } = ctx;

  // Policy session binding: never trust model/user sessionId in args.
  const modelArgs =
    toolCall.args && typeof toolCall.args === "object" ? { ...toolCall.args } : {};
  delete modelArgs.sessionId;
  delete modelArgs.incidentId;

  const validation = validateSessionOpsTool({
    tool: toolCall.name,
    args: modelArgs,
    sessionId: policySessionId,
    incidentSessionId: policySessionId,
    hostConfirmed: false,
  });

  if (!validation.ok && !validation.gate) {
    // Still audit via executor when possible (unknown tool / bad args).
    try {
      await ctx.execute(
        db,
        {
          incidentId,
          sessionId: policySessionId,
          actorUid,
          tool: toolCall.name,
          args: modelArgs,
          hostConfirmed: false,
        },
        ctx.executeDeps,
      );
    } catch (error) {
      return {
        status: "rejected",
        tool: toolCall.name,
        code:
          error instanceof Error
            ? error.message
            : validation.code ?? SESSION_OPS_UNKNOWN_TOOL,
        args: modelArgs,
      };
    }
    return {
      status: "rejected",
      tool: toolCall.name,
      code: validation.code ?? SESSION_OPS_UNKNOWN_TOOL,
      args: modelArgs,
    };
  }

  if (validation.gate) {
    const confirm = await ctx.requestConfirm(
      db,
      {
        incidentId,
        sessionId: policySessionId,
        tool: validation.toolId,
        args: validation.args,
        requestedByUid: actorUid,
      },
      {
        now: ctx.now,
        generateId: ctx.generateId,
        notify: ctx.notify,
      },
    );
    return {
      status: "host_confirm_required",
      tool: validation.toolId,
      code: SESSION_OPS_HOST_CONFIRM_REQUIRED,
      args: validation.args,
      confirmId: confirm.confirmId,
      expiresAt: confirm.expiresAt,
    };
  }

  const toolCap = await ctx.consumeTool(
    db,
    {
      incidentId,
      summonId: ctx.summonId,
      uid: actorUid,
      caps: ctx.caps,
      nowMs: ctx.now().getTime(),
    },
    {},
  );
  if (!toolCap.ok) {
    return {
      status: "rejected",
      tool: validation.toolId,
      code: toolCap.code ?? SESSION_OPS_TOOL_CAP,
      args: validation.args,
    };
  }

  const result = await ctx.execute(
    db,
    {
      incidentId,
      sessionId: policySessionId,
      actorUid,
      tool: validation.toolId,
      args: validation.args,
      hostConfirmed: false,
    },
    ctx.executeDeps,
  );

  return {
    status: result.status ?? "ok",
    tool: validation.toolId,
    args: validation.args,
    result,
    auditId: result.auditId ?? null,
    code: result.code ?? null,
  };
}

/**
 * Minimal support-thread write. Prefer `deps.appendSupportMessage` when a
 * dedicated helper exists (Task 6+).
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

  // Desk v1 also lists top-level messages; mirror agent/system lines lightly.
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
      });
  }

  return { messageId };
}

function formatToolOutcomeText(outcome) {
  if (outcome.status === "host_confirm_required") {
    return `Waiting on session host to confirm “${outcome.tool}”.`;
  }
  if (outcome.status === "rejected") {
    return `Could not run ${outcome.tool ?? "tool"} (${outcome.code ?? "rejected"}).`;
  }
  return `Ran ${outcome.tool}.`;
}

function defaultAssistantText(toolOutcomes) {
  if (!Array.isArray(toolOutcomes) || toolOutcomes.length === 0) {
    return null;
  }
  if (toolOutcomes.some((o) => o.status === "host_confirm_required")) {
    return "I need the session host to confirm a destructive change before I can proceed.";
  }
  if (toolOutcomes.every((o) => o.status === "ok" || o.status === "accepted")) {
    return "I applied a session fix. Let me know if it looks better.";
  }
  return "I could not complete every requested fix. Share more detail if the issue continues.";
}

function looksLikeQuestion(text) {
  return text.includes("?");
}
