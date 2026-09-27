import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_OPS_MCP_UNAUTHORIZED,
  SESSION_OPS_MCP_HEADER_INCIDENT,
  SESSION_OPS_MCP_HEADER_SESSION,
  SESSION_OPS_MCP_HEADER_ACTOR,
  SESSION_OPS_MCP_HEADER_SUMMON,
  authenticateSessionOpsMcp,
  handleSessionOpsMcpRequest,
} from "../incident/sessionOpsMcp.mjs";

test("authenticateSessionOpsMcp rejects missing bearer", () => {
  assert.equal(
    authenticateSessionOpsMcp({ authorization: "" }, "secret"),
    false,
  );
  assert.equal(
    authenticateSessionOpsMcp({ authorization: "Bearer wrong" }, "secret"),
    false,
  );
  assert.equal(
    authenticateSessionOpsMcp({ authorization: "Bearer secret" }, "secret"),
    true,
  );
});

test("handleSessionOpsMcpRequest returns 401 without auth", async () => {
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {},
      body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    },
    { authSecret: "secret" },
  );
  assert.equal(response.status, 401);
  assert.equal(response.body.error, SESSION_OPS_MCP_UNAUTHORIZED);
});

test("tools/list returns allowlisted tools only", async () => {
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
      },
      body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    },
    { authSecret: "secret" },
  );
  assert.equal(response.status, 200);
  const names = response.body.result.tools.map((t) => t.name);
  assert.ok(names.includes("soft_reload"));
  assert.ok(names.includes("end_session"));
  assert.equal(names.includes("not_a_tool"), false);
});

test("tools/call rejects unknown tool", async () => {
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
      },
      body: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "drop_database", arguments: {} },
      },
    },
    {
      authSecret: "secret",
      execute: async () => {
        throw new Error("should not execute");
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.result.isError, true);
  assert.match(response.body.result.content[0].text, /Unknown|unknown|SESSION_OPS_UNKNOWN/);
});

test("tools/call soft_reload uses bound session not model args", async () => {
  const calls = [];
  const caps = [];
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-bound",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
        [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
      },
      body: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "soft_reload",
          arguments: { sessionId: "evil-session", note: "ok" },
        },
      },
    },
    {
      authSecret: "secret",
      consumeTool: async (_db, input) => {
        caps.push(input);
        return { ok: true };
      },
      execute: async (input) => {
        calls.push(input);
        return { status: "accepted", tool: "soft_reload" };
      },
      resolveCaps: () => ({ toolsPerSummon: 20, globalToolAttemptsPerUidPerHour: 100 }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.result.isError, undefined);
  assert.equal(caps.length, 1);
  assert.equal(caps[0].summonId, "sum-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].incidentId, "inc-1");
  assert.equal(calls[0].sessionId, "sess-bound");
  assert.equal(calls[0].actorUid, "uid-1");
  assert.equal(calls[0].tool, "soft_reload");
  assert.equal(calls[0].args.sessionId, undefined);
  assert.equal(calls[0].args.note, "ok");
});

test("tools/call destructive tool requests host confirm", async () => {
  const confirms = [];
  const messages = [];
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
        [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
      },
      body: {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "reset_board", arguments: {} },
      },
    },
    {
      authSecret: "secret",
      requestConfirm: async (_db, input) => {
        confirms.push(input);
        return {
          confirmId: "c-1",
          expiresAt: "2099-01-01T00:00:00.000Z",
          status: "pending",
        };
      },
      appendSupportMessage: async (message) => {
        messages.push(message);
        return { messageId: "m-1" };
      },
      execute: async () => {
        throw new Error("should not execute destructive without confirm");
      },
      consumeTool: async () => {
        throw new Error("should not consume tool on gate");
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.result.isError, undefined);
  const outcome = JSON.parse(response.body.result.content[0].text);
  assert.equal(outcome.status, "host_confirm_required");
  assert.equal(outcome.confirmId, "c-1");
  assert.equal(outcome.tool, "reset_board");
  assert.equal(confirms.length, 1);
  assert.equal(confirms[0].tool, "reset_board");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, "host_confirm");
  assert.equal(messages[0].toolCall?.confirmId, "c-1");
});

test("tools/call rejects when tool cap is exhausted", async () => {
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
        [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
      },
      body: {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "soft_reload", arguments: {} },
      },
    },
    {
      authSecret: "secret",
      consumeTool: async () => ({ ok: false, code: "SESSION_OPS_TOOL_CAP" }),
      execute: async () => {
        throw new Error("should not execute");
      },
      resolveCaps: () => ({ toolsPerSummon: 1, globalToolAttemptsPerUidPerHour: 1 }),
    },
  );

  assert.equal(response.status, 200);
  const outcome = JSON.parse(response.body.result.content[0].text);
  assert.equal(outcome.status, "rejected");
  assert.equal(outcome.code, "SESSION_OPS_TOOL_CAP");
});
