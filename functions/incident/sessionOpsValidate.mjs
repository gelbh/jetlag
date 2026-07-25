import {
  getSessionOpsTool,
  isSessionOpsToolId,
  parseSessionOpsToolArgs,
} from "./sessionOpsTools.mjs";

export const SESSION_OPS_UNKNOWN_TOOL = "SESSION_OPS_UNKNOWN_TOOL";
export const SESSION_OPS_SESSION_MISMATCH = "SESSION_OPS_SESSION_MISMATCH";
export const SESSION_OPS_INVALID_ARGS = "SESSION_OPS_INVALID_ARGS";
export const SESSION_OPS_HOST_CONFIRM_REQUIRED =
  "SESSION_OPS_HOST_CONFIRM_REQUIRED";
export const SESSION_OPS_INCIDENT_NOT_FOUND = "SESSION_OPS_INCIDENT_NOT_FOUND";
export const SESSION_OPS_NO_SESSION = "SESSION_OPS_NO_SESSION";

/**
 * Validate a session-ops tool call against the closed allowlist and incident
 * session binding. Does not mutate. Dual-channel rule: never treat NL / args
 * `sessionId` as policy — caller must pass the policy sessionId separately.
 *
 * @param input {
 *   tool, args, sessionId, incidentSessionId, hostConfirmed?
 * }
 * @returns
 *   { ok: true, toolId, toolDef, args } |
 *   { ok: false, code, message, gate?: true, toolId?, args? }
 */
export function validateSessionOpsTool(input) {
  const tool = input?.tool;
  if (!isSessionOpsToolId(tool)) {
    return {
      ok: false,
      code: SESSION_OPS_UNKNOWN_TOOL,
      message: "Unknown session-ops tool.",
      toolId: typeof tool === "string" ? tool : null,
    };
  }

  const sessionId =
    typeof input.sessionId === "string" ? input.sessionId : "";
  const incidentSessionId =
    typeof input.incidentSessionId === "string"
      ? input.incidentSessionId
      : "";

  if (!sessionId || !incidentSessionId || sessionId !== incidentSessionId) {
    return {
      ok: false,
      code: SESSION_OPS_SESSION_MISMATCH,
      message: "Tool sessionId must match the incident session.",
      toolId: tool,
    };
  }

  let args;
  try {
    args = parseSessionOpsToolArgs(tool, input.args);
  } catch (error) {
    return {
      ok: false,
      code: SESSION_OPS_INVALID_ARGS,
      message:
        error instanceof Error ? error.message : "Invalid tool arguments.",
      toolId: tool,
    };
  }

  const toolDef = getSessionOpsTool(tool);
  if (toolDef.destructive && input.hostConfirmed !== true) {
    return {
      ok: false,
      code: SESSION_OPS_HOST_CONFIRM_REQUIRED,
      message: "Destructive tool requires host confirmation.",
      gate: true,
      toolId: tool,
      args,
      toolDef,
    };
  }

  return {
    ok: true,
    toolId: tool,
    toolDef,
    args,
  };
}
