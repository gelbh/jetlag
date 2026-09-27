import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_OPS_MCP_UNAUTHORIZED,
  SESSION_OPS_MCP_HEADER_INCIDENT,
  SESSION_OPS_MCP_HEADER_SESSION,
  SESSION_OPS_MCP_HEADER_ACTOR,
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
  const response = await handleSessionOpsMcpRequest(
    {
      headers: {
        authorization: "Bearer secret",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-bound",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
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
      execute: async (input) => {
        calls.push(input);
        return { status: "accepted", tool: "soft_reload" };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.result.isError, undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].incidentId, "inc-1");
  assert.equal(calls[0].sessionId, "sess-bound");
  assert.equal(calls[0].actorUid, "uid-1");
  assert.equal(calls[0].tool, "soft_reload");
  assert.equal(calls[0].args.sessionId, undefined);
  assert.equal(calls[0].args.note, "ok");
});
