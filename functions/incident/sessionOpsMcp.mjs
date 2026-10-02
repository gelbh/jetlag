/**
 * HTTP MCP surface for session-ops tools (Cursor Cloud Agents remote MCP).
 *
 * Auth: Bearer SESSION_OPS_MCP_AUTH_SECRET.
 * Binding: X-Jetlag-* headers minted at turn enqueue into mcpServers.headers
 * (never trust model-supplied sessionId/incidentId).
 *
 * Tool path mirrors the old sync turn loop:
 * validate → host confirm (destructive) → consume tool cap → execute.
 */

import { timingSafeEqual } from "node:crypto";
import { requestHostConfirm } from "./hostConfirm.mjs";
import {
  consumeSessionOpsTool,
  resolveSessionOpsCaps,
  SESSION_OPS_TOOL_CAP,
} from "./sessionOpsCaps.mjs";
import { appendSupportThreadMessage } from "./sessionOpsThread.mjs";
import {
  SESSION_OPS_TOOL_IDS,
  SESSION_OPS_TOOL_JSON_SCHEMAS,
  SESSION_OPS_TOOLS,
} from "./sessionOpsTools.mjs";
import {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_UNKNOWN_TOOL,
  validateSessionOpsTool,
} from "./sessionOpsValidate.mjs";

export const SESSION_OPS_MCP_UNAUTHORIZED = "SESSION_OPS_MCP_UNAUTHORIZED";
export const SESSION_OPS_MCP_HEADER_INCIDENT = "x-jetlag-incident-id";
export const SESSION_OPS_MCP_HEADER_SESSION = "x-jetlag-session-id";
export const SESSION_OPS_MCP_HEADER_ACTOR = "x-jetlag-actor-uid";
export const SESSION_OPS_MCP_HEADER_SUMMON = "x-jetlag-summon-id";

/**
 * @param {string} a
 * @param {string} b
 */
function safeEqualString(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {string} authSecret
 */
export function authenticateSessionOpsMcp(headers, authSecret) {
  const secret = typeof authSecret === "string" ? authSecret : "";
  if (!secret) {
    return false;
  }
  const raw = headers?.authorization ?? headers?.Authorization ?? "";
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.startsWith("Bearer ")) {
    return false;
  }
  const token = value.slice("Bearer ".length).trim();
  return safeEqualString(token, secret);
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {string} name
 */
function headerValue(headers, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === lower) {
      const raw = Array.isArray(value) ? value[0] : value;
      return typeof raw === "string" ? raw.trim() : "";
    }
  }
  return "";
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 */
export function readSessionOpsMcpBinding(headers) {
  return {
    incidentId: headerValue(headers, SESSION_OPS_MCP_HEADER_INCIDENT),
    sessionId: headerValue(headers, SESSION_OPS_MCP_HEADER_SESSION),
    actorUid: headerValue(headers, SESSION_OPS_MCP_HEADER_ACTOR),
    summonId: headerValue(headers, SESSION_OPS_MCP_HEADER_SUMMON),
  };
}

function buildToolsList() {
  return SESSION_OPS_TOOL_IDS.map((id) => ({
    name: id,
    description: SESSION_OPS_TOOLS[id]?.description ?? id,
    inputSchema: SESSION_OPS_TOOL_JSON_SCHEMAS[id] ?? {
      type: "object",
      properties: {},
    },
  }));
}

/**
 * @param {unknown} args
 */
function stripBindingArgs(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return {};
  }
  const next = { ...args };
  delete next.sessionId;
  delete next.incidentId;
  return next;
}

/**
 * @param {object} outcome
 */
function formatToolOutcomeText(outcome) {
  if (outcome.status === "host_confirm_required") {
    return `Waiting on session host to confirm “${outcome.tool}”.`;
  }
  if (outcome.status === "rejected") {
    return `Could not run ${outcome.tool ?? "tool"} (${outcome.code ?? "rejected"}).`;
  }
  return `Ran ${outcome.tool}.`;
}

/**
 * Validate → host confirm | consume tool cap → execute (bound session only).
 *
 * @param {{
 *   incidentId: string,
 *   sessionId: string,
 *   actorUid: string,
 *   summonId: string,
 *   tool: string,
 *   args: Record<string, unknown>,
 * }} input
 * @param {{
 *   db?: object,
 *   execute: Function,
 *   requestConfirm?: Function,
 *   consumeTool?: Function,
 *   resolveCaps?: Function,
 *   appendSupportMessage?: Function,
 *   notify?: Function,
 *   now?: () => Date,
 *   generateId?: () => string,
 *   loadIncident?: (incidentId: string) => Promise<object | null>,
 *   loadSession?: (sessionId: string) => Promise<object | null>,
 *   loadEntitlements?: (uid: string) => Promise<object | null>,
 * }} deps
 */
export async function runSessionOpsMcpBoundTool(input, deps) {
  const { incidentId, sessionId, actorUid, tool, args } = input;
  let summonId = typeof input.summonId === "string" ? input.summonId : "";

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => `id_${Math.random().toString(36).slice(2)}`);

  const loadIncident =
    deps.loadIncident ??
    (async (id) => {
      if (!deps.db) {
        return null;
      }
      const snap = await deps.db.collection("incidents").doc(id).get();
      return snap.exists ? (snap.data() ?? null) : null;
    });

  if (!summonId) {
    const incident = await loadIncident(incidentId);
    if (incident && typeof incident.activeSessionOpsSummonId === "string") {
      summonId = incident.activeSessionOpsSummonId;
    } else if (incident?.supportAgentRun && typeof incident.supportAgentRun.summonId === "string") {
      summonId = incident.supportAgentRun.summonId;
    }
  }

  const validation = validateSessionOpsTool({
    tool,
    args,
    sessionId,
    incidentSessionId: sessionId,
    hostConfirmed: false,
  });

  if (!validation.ok && !validation.gate) {
    return {
      status: "rejected",
      tool: validation.toolId ?? tool,
      code: validation.code ?? SESSION_OPS_UNKNOWN_TOOL,
      args,
    };
  }

  const appendMessage =
    deps.appendSupportMessage ??
    (deps.db
      ? (message) => appendSupportThreadMessage(deps.db, incidentId, message, generateId)
      : null);

  if (validation.gate) {
    const requestConfirm = deps.requestConfirm ?? requestHostConfirm;
    if (typeof requestConfirm !== "function") {
      throw new Error("SESSION_OPS_MCP_CONFIRM_MISSING");
    }
    const confirm = await requestConfirm(
      deps.db,
      {
        incidentId,
        sessionId,
        tool: validation.toolId,
        args: validation.args,
        requestedByUid: actorUid,
      },
      {
        now,
        generateId,
        notify: deps.notify,
      },
    );
    const outcome = {
      status: "host_confirm_required",
      tool: validation.toolId,
      code: SESSION_OPS_HOST_CONFIRM_REQUIRED,
      args: validation.args,
      confirmId: confirm.confirmId,
      expiresAt: confirm.expiresAt,
    };
    if (typeof appendMessage === "function") {
      await appendMessage({
        sender: "system",
        senderUid: null,
        kind: "host_confirm",
        text: formatToolOutcomeText(outcome),
        visibility: "support",
        toolCall: {
          name: validation.toolId,
          args: validation.args,
          status: outcome.status,
          code: outcome.code,
          confirmId: outcome.confirmId,
        },
        createdAt: now().toISOString(),
      });
    }
    return outcome;
  }

  const loadSession =
    deps.loadSession ??
    (async (id) => {
      if (!deps.db) {
        return null;
      }
      const snap = await deps.db.collection("sessions").doc(id).get();
      return snap.exists ? (snap.data() ?? null) : null;
    });
  const loadEntitlements =
    deps.loadEntitlements ??
    (async (uid) => {
      if (!deps.db) {
        return null;
      }
      const snap = await deps.db.collection("users").doc(uid).get();
      return snap.exists ? (snap.data() ?? null) : null;
    });

  const resolveCaps = deps.resolveCaps ?? resolveSessionOpsCaps;
  let caps;
  if (deps.resolveCaps) {
    caps = resolveCaps();
  } else {
    const incident = await loadIncident(incidentId);
    const session = await loadSession(sessionId);
    const entitlementsData = await loadEntitlements(
      typeof incident?.reporterUid === "string" ? incident.reporterUid : actorUid,
    );
    caps = resolveCaps({
      entitlementsData,
      sessionTier: typeof session?.tier === "string" ? session.tier : null,
    });
  }

  const consumeTool = deps.consumeTool ?? consumeSessionOpsTool;
  const toolCap = await consumeTool(
    deps.db,
    {
      incidentId,
      summonId,
      uid: actorUid,
      caps,
      nowMs: now().getTime(),
    },
    {},
  );
  if (!toolCap.ok) {
    const outcome = {
      status: "rejected",
      tool: validation.toolId,
      code: toolCap.code ?? SESSION_OPS_TOOL_CAP,
      args: validation.args,
    };
    if (typeof appendMessage === "function") {
      await appendMessage({
        sender: "system",
        senderUid: null,
        kind: "tool_result",
        text: formatToolOutcomeText(outcome),
        visibility: "support",
        toolCall: {
          name: validation.toolId,
          args: validation.args,
          status: outcome.status,
          code: outcome.code,
        },
        createdAt: now().toISOString(),
      });
    }
    return outcome;
  }

  if (typeof deps.execute !== "function") {
    throw new Error("SESSION_OPS_MCP_EXECUTE_MISSING");
  }

  const result = await deps.execute({
    incidentId,
    sessionId,
    actorUid,
    tool: validation.toolId,
    args: validation.args,
    hostConfirmed: false,
  });

  const outcome = {
    status: result?.status ?? "accepted",
    tool: validation.toolId,
    args: validation.args,
    result,
  };
  if (typeof appendMessage === "function") {
    await appendMessage({
      sender: "system",
      senderUid: null,
      kind: "tool_result",
      text: formatToolOutcomeText(outcome),
      visibility: "support",
      toolCall: {
        name: validation.toolId,
        args: validation.args,
        status: outcome.status,
        code: null,
      },
      createdAt: now().toISOString(),
    });
  }
  return outcome;
}

/**
 * Core JSON-RPC MCP handler (streamable-HTTP compatible request body).
 *
 * @param {{
 *   headers: Record<string, string | string[] | undefined>,
 *   body: unknown,
 * }} request
 * @param {{
 *   authSecret: string,
 *   db?: object,
 *   execute?: Function,
 *   requestConfirm?: Function,
 *   consumeTool?: Function,
 *   resolveCaps?: Function,
 *   appendSupportMessage?: Function,
 *   notify?: Function,
 *   now?: () => Date,
 *   generateId?: () => string,
 * }} deps
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function handleSessionOpsMcpRequest(request, deps) {
  const headers = request?.headers ?? {};
  if (!authenticateSessionOpsMcp(headers, deps.authSecret)) {
    return {
      status: 401,
      body: { error: SESSION_OPS_MCP_UNAUTHORIZED },
    };
  }

  const body = request?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      status: 400,
      body: {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
    };
  }

  const id = "id" in body ? body.id : null;
  const method = typeof body.method === "string" ? body.method : "";

  if (method === "initialize") {
    return {
      status: 200,
      body: {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "jetlag-session-ops", version: "1.0.0" },
        },
      },
    };
  }

  if (method === "notifications/initialized" || method === "ping") {
    return {
      status: 200,
      body: { jsonrpc: "2.0", id, result: {} },
    };
  }

  if (method === "tools/list") {
    return {
      status: 200,
      body: {
        jsonrpc: "2.0",
        id,
        result: { tools: buildToolsList() },
      },
    };
  }

  if (method === "tools/call") {
    const params = body.params && typeof body.params === "object" ? body.params : {};
    const toolName = typeof params.name === "string" ? params.name : "";
    const binding = readSessionOpsMcpBinding(headers);

    if (!SESSION_OPS_TOOL_IDS.includes(toolName)) {
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `${SESSION_OPS_UNKNOWN_TOOL}: Unknown session-ops tool.`,
              },
            ],
          },
        },
      };
    }

    if (!binding.incidentId || !binding.sessionId || !binding.actorUid) {
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: "Missing bound incident/session/actor headers.",
              },
            ],
          },
        },
      };
    }

    const args = stripBindingArgs(params.arguments);
    try {
      const outcome = await runSessionOpsMcpBoundTool(
        {
          incidentId: binding.incidentId,
          sessionId: binding.sessionId,
          actorUid: binding.actorUid,
          summonId: binding.summonId,
          tool: toolName,
          args,
        },
        deps,
      );
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(outcome ?? { ok: true }),
              },
            ],
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "SESSION_OPS_MCP_FAILED";
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: message }],
          },
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
  };
}
