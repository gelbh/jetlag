import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_INVALID_ARGS,
  SESSION_OPS_SESSION_MISMATCH,
  SESSION_OPS_UNKNOWN_TOOL,
  validateSessionOpsTool,
} from "../incident/sessionOpsValidate.mjs";

test("validateSessionOpsTool rejects unknown tools", () => {
  const result = validateSessionOpsTool({
    tool: "teleport",
    args: {},
    sessionId: "sess-1",
    incidentSessionId: "sess-1",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, SESSION_OPS_UNKNOWN_TOOL);
});

test("validateSessionOpsTool rejects sessionId mismatch", () => {
  const result = validateSessionOpsTool({
    tool: "soft_reload",
    args: {},
    sessionId: "sess-other",
    incidentSessionId: "sess-1",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, SESSION_OPS_SESSION_MISMATCH);
});

test("validateSessionOpsTool rejects model-supplied sessionId in args", () => {
  const result = validateSessionOpsTool({
    tool: "soft_reload",
    args: { sessionId: "sess-evil" },
    sessionId: "sess-1",
    incidentSessionId: "sess-1",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, SESSION_OPS_INVALID_ARGS);
});

test("validateSessionOpsTool gates destructive tools without hostConfirmed", () => {
  const result = validateSessionOpsTool({
    tool: "reset_board",
    args: {},
    sessionId: "sess-1",
    incidentSessionId: "sess-1",
    hostConfirmed: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.gate, true);
  assert.equal(result.code, SESSION_OPS_HOST_CONFIRM_REQUIRED);
});

test("validateSessionOpsTool accepts soft_reload without hostConfirmed", () => {
  const result = validateSessionOpsTool({
    tool: "soft_reload",
    args: { note: "try refresh" },
    sessionId: "sess-1",
    incidentSessionId: "sess-1",
  });
  assert.equal(result.ok, true);
  assert.equal(result.toolId, "soft_reload");
  assert.deepEqual(result.args, { note: "try refresh" });
});

test("validateSessionOpsTool accepts destructive when hostConfirmed", () => {
  const result = validateSessionOpsTool({
    tool: "end_session",
    args: {},
    sessionId: "sess-1",
    incidentSessionId: "sess-1",
    hostConfirmed: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.toolDef.destructive, true);
});
