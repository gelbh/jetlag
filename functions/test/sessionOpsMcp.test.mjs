import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { handleSessionOpsMcpHttp } from "../handlers/incident/sessionOpsMcpHttp.mjs";
import {
  authenticateSessionOpsMcp,
  createSessionOpsMcpServer,
  SESSION_OPS_MCP_HEADER_ACTOR,
  SESSION_OPS_MCP_HEADER_INCIDENT,
  SESSION_OPS_MCP_HEADER_SESSION,
  SESSION_OPS_MCP_HEADER_SUMMON,
  SESSION_OPS_MCP_UNAUTHORIZED,
} from "../incident/sessionOpsMcp.mjs";

/**
 * @param {object} deps
 * @param {Record<string, string>} headers
 */
async function connectSessionOpsMcpClient(deps, headers) {
  const { server } = createSessionOpsMcpServer(deps, { headers });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "session-ops-mcp-test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/**
 * Minimal Express-shaped res for auth / health paths (before StreamableHTTP).
 */
function createExpressLikeRes() {
  /** @type {{ statusCode: number, body: unknown }} */
  const state = { statusCode: 200, body: null };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(body) {
      state.body = body;
      return res;
    },
  };
  return { res, state };
}

test("authenticateSessionOpsMcp rejects missing bearer", () => {
  assert.equal(authenticateSessionOpsMcp({ authorization: "" }, "secret"), false);
  assert.equal(authenticateSessionOpsMcp({ authorization: "Bearer wrong" }, "secret"), false);
  assert.equal(authenticateSessionOpsMcp({ authorization: "Bearer secret" }, "secret"), true);
});

test("createSessionOpsMcpServer registers allowlisted tools only", async () => {
  const client = await connectSessionOpsMcpClient(
    { authSecret: "secret" },
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
    },
  );
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("soft_reload"));
  assert.ok(names.includes("end_session"));
  assert.equal(names.includes("not_a_tool"), false);
  assert.equal(names.includes("drop_database"), false);
});

test("handleSessionOpsMcpHttp returns 401 without auth", async () => {
  const { res, state } = createExpressLikeRes();
  await handleSessionOpsMcpHttp(
    { method: "POST", headers: {} },
    res,
    { authSecret: "secret", posthog: { flush: async () => {} } },
  );
  assert.equal(state.statusCode, 401);
  assert.equal(state.body.error, SESSION_OPS_MCP_UNAUTHORIZED);
});

test("tools/list returns allowlisted tools only", async () => {
  const client = await connectSessionOpsMcpClient(
    { authSecret: "secret" },
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
    },
  );
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("soft_reload"));
  assert.ok(names.includes("end_session"));
  assert.equal(names.includes("not_a_tool"), false);
});

test("tools/call rejects unknown tool", async () => {
  const client = await connectSessionOpsMcpClient(
    {
      authSecret: "secret",
      execute: async () => {
        throw new Error("should not execute");
      },
    },
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
    },
  );
  const result = await client.callTool({ name: "drop_database", arguments: {} });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Unknown|unknown|SESSION_OPS_UNKNOWN|not found/i);
});

test("tools/call soft_reload uses bound session not model args", async () => {
  const calls = [];
  const caps = [];
  const client = await connectSessionOpsMcpClient(
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
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-bound",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
      [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
    },
  );

  const result = await client.callTool({
    name: "soft_reload",
    arguments: { sessionId: "evil-session", note: "ok" },
  });

  assert.equal(result.isError, undefined);
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
  const client = await connectSessionOpsMcpClient(
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
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
      [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
    },
  );

  const result = await client.callTool({ name: "reset_board", arguments: {} });
  assert.equal(result.isError, undefined);
  const outcome = JSON.parse(result.content[0].text);
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
  const client = await connectSessionOpsMcpClient(
    {
      authSecret: "secret",
      consumeTool: async () => ({ ok: false, code: "SESSION_OPS_TOOL_CAP" }),
      execute: async () => {
        throw new Error("should not execute");
      },
      resolveCaps: () => ({ toolsPerSummon: 1, globalToolAttemptsPerUidPerHour: 1 }),
    },
    {
      [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
      [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
      [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
      [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
    },
  );

  const result = await client.callTool({ name: "soft_reload", arguments: {} });
  const outcome = JSON.parse(result.content[0].text);
  assert.equal(outcome.status, "rejected");
  assert.equal(outcome.code, "SESSION_OPS_TOOL_CAP");
});

test("handleSessionOpsMcpHttp flushes posthog after tools/call", async () => {
  const flushCalls = [];
  const posthog = {
    flush: async () => {
      flushCalls.push(Date.now());
    },
  };

  const httpServer = http.createServer(async (req, res) => {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
    };
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : null;
    await handleSessionOpsMcpHttp(req, res, {
      authSecret: "secret",
      posthog,
      body,
      consumeTool: async () => ({ ok: true }),
      execute: async () => ({ status: "accepted", tool: "soft_reload" }),
      resolveCaps: () => ({ toolsPerSummon: 20, globalToolAttemptsPerUidPerHour: 100 }),
    });
  });

  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = /** @type {import("node:net").AddressInfo} */ (httpServer.address());

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: "POST",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        [SESSION_OPS_MCP_HEADER_INCIDENT]: "inc-1",
        [SESSION_OPS_MCP_HEADER_SESSION]: "sess-1",
        [SESSION_OPS_MCP_HEADER_ACTOR]: "uid-1",
        [SESSION_OPS_MCP_HEADER_SUMMON]: "sum-1",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "soft_reload", arguments: { note: "flush-check" } },
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.result.isError, undefined);
    const outcome = JSON.parse(payload.result.content[0].text);
    assert.equal(outcome.status, "accepted");
    assert.equal(flushCalls.length, 1);
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});
