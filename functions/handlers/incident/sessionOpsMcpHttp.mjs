import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { requestHostConfirm } from "../../incident/hostConfirm.mjs";
import { consumeSessionOpsTool } from "../../incident/sessionOpsCaps.mjs";
import { executeSessionOpsTool } from "../../incident/sessionOpsExecute.mjs";
import { handleSessionOpsMcpRequest } from "../../incident/sessionOpsMcp.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import {
  buildSessionOpsExecuteDeps,
  posthogProjectApiKey,
  sessionOpsMcpAuthSecret,
} from "./shared.mjs";

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
    if (req.method === "GET" || req.method === "HEAD") {
      res.status(200).json({ ok: true, service: "jetlag-session-ops-mcp" });
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const db = getFirestore();
    const authSecret = sessionOpsMcpAuthSecret.value();
    const response = await handleSessionOpsMcpRequest(
      {
        headers: req.headers,
        body: readJsonBody(req),
      },
      {
        authSecret,
        db,
        execute: (input) => executeSessionOpsTool(db, input, buildSessionOpsExecuteDeps(db)),
        requestConfirm: (firestore, input, confirmDeps) =>
          requestHostConfirm(firestore, input, confirmDeps),
        consumeTool: (firestore, input, toolDeps) =>
          consumeSessionOpsTool(firestore, input, toolDeps),
      },
    );

    res.status(response.status).json(response.body);
  }),
);
