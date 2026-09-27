/**
 * HTTP MCP surface for session-ops tools (Cursor Cloud Agents remote MCP).
 *
 * Auth: Bearer SESSION_OPS_MCP_AUTH_SECRET.
 * Binding: X-Jetlag-* headers minted at turn enqueue into mcpServers.headers
 * (never trust model-supplied sessionId/incidentId).
 */

import { timingSafeEqual } from "node:crypto";
import {
  SESSION_OPS_TOOL_IDS,
  SESSION_OPS_TOOLS,
  SESSION_OPS_TOOL_JSON_SCHEMAS,
} from "./sessionOpsTools.mjs";
import { SESSION_OPS_UNKNOWN_TOOL } from "./sessionOpsValidate.mjs";

export const SESSION_OPS_MCP_UNAUTHORIZED = "SESSION_OPS_MCP_UNAUTHORIZED";
export const SESSION_OPS_MCP_HEADER_INCIDENT = "x-jetlag-incident-id";
export const SESSION_OPS_MCP_HEADER_SESSION = "x-jetlag-session-id";
export const SESSION_OPS_MCP_HEADER_ACTOR = "x-jetlag-actor-uid";

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
 * Core JSON-RPC MCP handler (streamable-HTTP compatible request body).
 *
 * @param {{
 *   headers: Record<string, string | string[] | undefined>,
 *   body: unknown,
 * }} request
 * @param {{
 *   authSecret: string,
 *   execute?: (input: {
 *     incidentId: string,
 *     sessionId: string,
 *     actorUid: string,
 *     tool: string,
 *     args: Record<string, unknown>,
 *   }) => Promise<unknown>,
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
    const params =
      body.params && typeof body.params === "object" ? body.params : {};
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
      const execute = deps.execute;
      if (typeof execute !== "function") {
        throw new Error("SESSION_OPS_MCP_EXECUTE_MISSING");
      }
      const outcome = await execute({
        incidentId: binding.incidentId,
        sessionId: binding.sessionId,
        actorUid: binding.actorUid,
        tool: toolName,
        args,
      });
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
      const message =
        error instanceof Error ? error.message : "SESSION_OPS_MCP_FAILED";
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
