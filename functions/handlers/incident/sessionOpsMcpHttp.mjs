import { getRequestHeaders, instrument } from "@posthog/mcp";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { PostHog } from "posthog-node";
import { requestHostConfirm } from "../../incident/hostConfirm.mjs";
import { consumeSessionOpsTool } from "../../incident/sessionOpsCaps.mjs";
import { executeSessionOpsTool } from "../../incident/sessionOpsExecute.mjs";
import {
  authenticateSessionOpsMcp,
  createSessionOpsMcpServer,
  readSessionOpsMcpBinding,
  SESSION_OPS_MCP_UNAUTHORIZED,
} from "../../incident/sessionOpsMcp.mjs";
import { SESSION_OPS_TOOL_JSON_SCHEMAS } from "../../incident/sessionOpsTools.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { POSTHOG_HOST } from "../../lib/posthog.mjs";
import {
  buildSessionOpsExecuteDeps,
  posthogProjectApiKey,
  sessionOpsMcpAuthSecret,
} from "./shared.mjs";

/** @type {import("posthog-node").PostHog | null} */
let sessionOpsMcpPosthog = null;
/** @type {string | null} */
let sessionOpsMcpPosthogKey = null;

export function resetSessionOpsMcpPosthogForTests() {
  sessionOpsMcpPosthog = null;
  sessionOpsMcpPosthogKey = null;
}

/**
 * @param {string} apiKey
 * @returns {import("posthog-node").PostHog | null}
 */
function getOrCreateSessionOpsMcpPosthog(apiKey) {
  if (!apiKey) {
    return null;
  }
  if (sessionOpsMcpPosthog && sessionOpsMcpPosthogKey === apiKey) {
    return sessionOpsMcpPosthog;
  }
  sessionOpsMcpPosthog = new PostHog(apiKey, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  sessionOpsMcpPosthogKey = apiKey;
  return sessionOpsMcpPosthog;
}

/**
 * Parse JSON body from an Express-style request.
 * @param {import("express").Request} req
 */
function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.rawBody === "string" && req.rawBody.trim()) {
    try {
      return JSON.parse(req.rawBody);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Record<string, string | string[] | undefined> | undefined} headers
 */
function bindingEventProperties(headers) {
  const binding = readSessionOpsMcpBinding(headers ?? {});
  /** @type {Record<string, string>} */
  const props = {};
  if (binding.incidentId) {
    props.incident_id = binding.incidentId;
  }
  if (binding.sessionId) {
    props.session_id = binding.sessionId;
  }
  if (binding.summonId) {
    props.summon_id = binding.summonId;
  }
  return Object.keys(props).length > 0 ? props : null;
}

/**
 * Auth → per-request McpServer → instrument → StreamableHTTP handleRequest → flush.
 * Injectable `posthog` keeps unit tests off Firebase and real ingest.
 *
 * @param {import("express").Request | import("node:http").IncomingMessage} req
 * @param {import("express").Response | import("node:http").ServerResponse} res
 * @param {{
 *   authSecret: string,
 *   posthogApiKey?: string,
 *   posthog?: { flush?: () => Promise<unknown> | unknown, capture?: Function } | null,
 *   body?: unknown,
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
 */
export async function handleSessionOpsMcpHttp(req, res, deps) {
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") {
    res.status(200).json({ ok: true, service: "jetlag-session-ops-mcp" });
    return;
  }
  if (method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const headers = req.headers ?? {};
  if (!authenticateSessionOpsMcp(headers, deps.authSecret)) {
    res.status(401).json({ error: SESSION_OPS_MCP_UNAUTHORIZED });
    return;
  }

  const posthog =
    deps.posthog !== undefined
      ? deps.posthog
      : getOrCreateSessionOpsMcpPosthog(deps.posthogApiKey ?? "");

  const body =
    deps.body !== undefined
      ? deps.body
      : readJsonBody(/** @type {import("express").Request} */ (req));
  const { server, transport } = createSessionOpsMcpServer(deps, { headers });

  instrument(server, posthog, {
    identify: async (_request, extra) => {
      const requestHeaders = getRequestHeaders(extra) ?? headers;
      const binding = readSessionOpsMcpBinding(requestHeaders);
      if (!binding.actorUid) {
        return null;
      }
      return { distinctId: binding.actorUid };
    },
    resolveOriginalTool: (toolName) => {
      const inputSchema = SESSION_OPS_TOOL_JSON_SCHEMAS[toolName];
      return inputSchema ? { inputSchema } : undefined;
    },
    eventProperties: async (_request, extra) =>
      bindingEventProperties(getRequestHeaders(extra) ?? headers),
  });

  await server.connect(transport);
  try {
    await transport.handleRequest(
      /** @type {import("node:http").IncomingMessage} */ (req),
      /** @type {import("node:http").ServerResponse} */ (res),
      body,
    );
  } finally {
    try {
      await posthog?.flush?.();
    } catch {
      // Soft-fail: analytics must never break MCP responses.
    }
  }
}

/**
 * Cursor Cloud Agents remote MCP endpoint for session-ops tools.
 * No App Check: Cursor server calls this with Bearer + binding headers.
 */
export const sessionOpsMcp = onRequest(
  {
    secrets: [posthogProjectApiKey, sessionOpsMcpAuthSecret],
    enforceAppCheck: false,
    cors: false,
    timeoutSeconds: 60,
  },
  withFunctionsExceptionHandler(async (req, res) => {
    const db = getFirestore();
    await handleSessionOpsMcpHttp(req, res, {
      authSecret: sessionOpsMcpAuthSecret.value(),
      posthogApiKey: posthogProjectApiKey.value(),
      db,
      execute: (input) => executeSessionOpsTool(db, input, buildSessionOpsExecuteDeps(db)),
      requestConfirm: (firestore, input, confirmDeps) =>
        requestHostConfirm(firestore, input, confirmDeps),
      consumeTool: (firestore, input, toolDeps) =>
        consumeSessionOpsTool(firestore, input, toolDeps),
    });
  }),
);
