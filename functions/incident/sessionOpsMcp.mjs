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
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { requestHostConfirm } from "./hostConfirm.mjs";
import {
  consumeSessionOpsTool,
  resolveSessionOpsCaps,
  SESSION_OPS_TOOL_CAP,
} from "./sessionOpsCaps.mjs";
import { appendSupportThreadMessage } from "./sessionOpsThread.mjs";
import {
  SESSION_OPS_TOOL_IDS,
  SESSION_OPS_TOOLS,
} from "./sessionOpsTools.mjs";
import {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_UNKNOWN_TOOL,
  validateSessionOpsTool,
} from "./sessionOpsValidate.mjs";

const SESSION_OPS_MCP_SERVER_INFO = { name: "jetlag-session-ops", version: "1.0.0" };

/** Mirrors SESSION_OPS_TOOL_JSON_SCHEMAS note fields for McpServer.tool() Zod shapes. */
const sessionOpsNoteField = z.string().max(140).optional();

/** Zod shapes for tool registration (SDK requires Zod, not JSON Schema). */
const SESSION_OPS_TOOL_ZOD_SHAPES = {
  soft_reload: { note: sessionOpsNoteField },
  reset_board: { note: sessionOpsNoteField },
  clear_pending_questions: { note: sessionOpsNoteField },
  cancel_pending_question: {
    questionId: z.string().min(1),
    note: sessionOpsNoteField,
  },
  end_session: { note: sessionOpsNoteField },
  soft_delete_annotation: {
    annotationId: z.string().min(1),
    note: sessionOpsNoteField,
  },
};

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
 * Per-request McpServer + StreamableHTTP transport (do not reuse across clients).
 *
 * @param {object} deps
 * @param {{
 *   headers?: Record<string, string | string[] | undefined>,
 *   binding?: { incidentId: string, sessionId: string, actorUid: string, summonId: string },
 *   posthog?: unknown,
 * }} [requestContext]
 * @returns {{ server: McpServer, transport: StreamableHTTPServerTransport }}
 */
export function createSessionOpsMcpServer(deps, requestContext = {}) {
  const headers = requestContext.headers ?? {};
  const binding = requestContext.binding ?? readSessionOpsMcpBinding(headers);
  const server = new McpServer(SESSION_OPS_MCP_SERVER_INFO);

  for (const toolId of SESSION_OPS_TOOL_IDS) {
    const description = SESSION_OPS_TOOLS[toolId]?.description ?? toolId;
    const inputSchema = SESSION_OPS_TOOL_ZOD_SHAPES[toolId] ?? {};
    server.tool(toolId, description, inputSchema, async (args) => {
      if (!binding.incidentId || !binding.sessionId || !binding.actorUid) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Missing bound incident/session/actor headers.",
            },
          ],
        };
      }
      try {
        const outcome = await runSessionOpsMcpBoundTool(
          {
            incidentId: binding.incidentId,
            sessionId: binding.sessionId,
            actorUid: binding.actorUid,
            summonId: binding.summonId,
            tool: toolId,
            args: stripBindingArgs(args),
          },
          deps,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(outcome ?? { ok: true }),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "SESSION_OPS_MCP_FAILED";
        return {
          isError: true,
          content: [{ type: "text", text: message }],
        };
      }
    });
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  return { server, transport };
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
