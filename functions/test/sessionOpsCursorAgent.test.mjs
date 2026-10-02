import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionOpsAgent,
  createSessionOpsRun,
  getSessionOpsRun,
  SESSION_OPS_AGENT_BUSY,
  SESSION_OPS_AGENT_FAILED,
  SESSION_OPS_AGENT_MISCONFIGURED,
} from "../incident/sessionOpsCursorAgent.mjs";

test("createSessionOpsAgent posts no-repo agent with HTTP mcpServers", async () => {
  const calls = [];
  const result = await createSessionOpsAgent(
    {
      apiKey: "test-key",
      promptText: "Help the player soft-reload",
      mcpUrl: "https://example.test/mcp",
      mcpAuthHeader: "Bearer mcp-secret",
      name: "Incident inc-1 session-ops",
    },
    {
      fetch: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            agent: {
              id: "bc-agent-1",
              url: "https://cursor.com/agents/bc-agent-1",
              latestRunId: "run-1",
            },
            run: { id: "run-1", status: "CREATING" },
          }),
        };
      },
    },
  );

  assert.equal(result.agentId, "bc-agent-1");
  assert.equal(result.runId, "run-1");
  assert.equal(result.agentUrl, "https://cursor.com/agents/bc-agent-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.cursor.com/v1/agents");
  assert.match(calls[0].init.headers.Authorization, /^Basic /);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.prompt.text, "Help the player soft-reload");
  assert.equal(body.repos, undefined);
  assert.equal(body.env, undefined);
  assert.deepEqual(body.mcpServers, [
    {
      name: "jetlag-session-ops",
      type: "http",
      url: "https://example.test/mcp",
      headers: { Authorization: "Bearer mcp-secret" },
    },
  ]);
});

test("createSessionOpsAgent rejects missing apiKey", async () => {
  await assert.rejects(
    () =>
      createSessionOpsAgent({
        apiKey: "",
        promptText: "x",
        mcpUrl: "https://example.test/mcp",
        mcpAuthHeader: "Bearer x",
      }),
    (error) => error.message === SESSION_OPS_AGENT_MISCONFIGURED,
  );
});

test("createSessionOpsRun posts follow-up run with mcpServers", async () => {
  const calls = [];
  const result = await createSessionOpsRun(
    {
      apiKey: "test-key",
      agentId: "bc-agent-1",
      promptText: "Second turn",
      mcpUrl: "https://example.test/mcp",
      mcpAuthHeader: "Bearer mcp-secret",
    },
    {
      fetch: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            run: { id: "run-2", status: "CREATING" },
          }),
        };
      },
    },
  );

  assert.equal(result.runId, "run-2");
  assert.equal(calls[0].url, "https://api.cursor.com/v1/agents/bc-agent-1/runs");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.prompt.text, "Second turn");
  assert.equal(body.mcpServers[0].type, "http");
});

test("createSessionOpsRun maps 409 to SESSION_OPS_AGENT_BUSY", async () => {
  await assert.rejects(
    () =>
      createSessionOpsRun(
        {
          apiKey: "test-key",
          agentId: "bc-agent-1",
          promptText: "busy",
          mcpUrl: "https://example.test/mcp",
          mcpAuthHeader: "Bearer x",
        },
        {
          fetch: async () => ({
            ok: false,
            status: 409,
            json: async () => ({ code: "agent_busy" }),
          }),
        },
      ),
    (error) => error.message === SESSION_OPS_AGENT_BUSY,
  );
});

test("getSessionOpsRun returns status and text", async () => {
  const result = await getSessionOpsRun(
    {
      apiKey: "test-key",
      agentId: "bc-agent-1",
      runId: "run-1",
    },
    {
      fetch: async (url) => {
        assert.equal(url, "https://api.cursor.com/v1/agents/bc-agent-1/runs/run-1");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "run-1",
            status: "FINISHED",
            result: { text: "Done soft_reload." },
          }),
        };
      },
    },
  );

  assert.equal(result.status, "FINISHED");
  assert.equal(result.text, "Done soft_reload.");
});

test("getSessionOpsRun maps non-ok to SESSION_OPS_AGENT_FAILED", async () => {
  await assert.rejects(
    () =>
      getSessionOpsRun(
        { apiKey: "test-key", agentId: "bc-agent-1", runId: "run-1" },
        {
          fetch: async () => ({
            ok: false,
            status: 500,
            json: async () => ({}),
          }),
        },
      ),
    (error) => error.message === SESSION_OPS_AGENT_FAILED,
  );
});
