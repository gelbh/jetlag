import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORT_AGENT_WORKING_TEXT,
  supportAgentTurnHandler,
} from "../incident/supportAgentTurn.mjs";
import { SESSION_OPS_AGENT_BUSY } from "../incident/sessionOpsCursorAgent.mjs";
import { getSessionOpsCaps } from "../incident/sessionOpsCaps.mjs";

function createInMemoryFirestore() {
  const documents = new Map();

  function docPath(parts) {
    return parts.join("/");
  }

  function createDocRef(parts) {
    const path = docPath(parts);
    return {
      path,
      id: parts[parts.length - 1],
      get: async () => {
        const data = documents.get(path);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data, options = {}) => {
        if (options.merge) {
          documents.set(path, { ...(documents.get(path) ?? {}), ...data });
        } else {
          documents.set(path, { ...data });
        }
      },
      update: async (data) => {
        documents.set(path, { ...(documents.get(path) ?? {}), ...data });
      },
      collection: (name) => ({
        doc: (id) => createDocRef([...parts, name, id]),
      }),
    };
  }

  return {
    documents,
    collection(name) {
      return {
        doc(id) {
          return createDocRef([name, id]);
        },
      };
    },
    async runTransaction(callback) {
      const pendingWrites = new Map();
      const transaction = {
        async get(ref) {
          if (pendingWrites.has(ref.path)) {
            const pending = pendingWrites.get(ref.path);
            return { exists: true, data: () => pending };
          }
          const data = documents.get(ref.path);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        set(ref, data, options = {}) {
          const base = options.merge
            ? {
                ...(pendingWrites.get(ref.path) ??
                  documents.get(ref.path) ??
                  {}),
                ...data,
              }
            : { ...data };
          pendingWrites.set(ref.path, base);
        },
      };
      const result = await callback(transaction);
      for (const [path, value] of pendingWrites.entries()) {
        documents.set(path, value);
      }
      return result;
    },
  };
}

function seedIncidentDb(db, overrides = {}) {
  db.documents.set("incidents/inc-1", {
    status: "open",
    reporterUid: "reporter-1",
    sessionId: "sess-1",
    diagnostics: { appVersion: "1.0.0", route: "/map" },
    ...overrides.incident,
  });
  db.documents.set("sessions/sess-1", {
    status: "active",
    hostUid: "host-1",
    memberUids: ["host-1", "reporter-1"],
    tier: "free",
    ...overrides.session,
  });
  db.documents.set("users/reporter-1", {
    lifetimePremium: false,
    ...overrides.user,
  });
}

const cursorDepsBase = {
  apiKey: "cursor-key",
  mcpUrl: "https://example.test/mcp",
  mcpAuthSecret: "mcp-secret",
  resolveCaps: () => getSessionOpsCaps("free"),
};

test("async turn creates no-repo agent and writes working placeholder", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db);
  let id = 0;
  /** @type {Array<object>} */
  const agentCalls = [];

  const result = await supportAgentTurnHandler(
    db,
    {
      incidentId: "inc-1",
      uid: "reporter-1",
      text: "Map is blank after reconnect.",
    },
    {
      ...cursorDepsBase,
      now: () => new Date("2026-07-26T00:00:00.000Z"),
      generateId: () => `id-${(id += 1)}`,
      createAgent: async (input) => {
        agentCalls.push({ type: "create", input });
        assert.equal(input.mcpExtraHeaders["x-jetlag-session-id"], "sess-1");
        assert.match(input.promptText, /boundSessionId: sess-1/);
        assert.doesNotMatch(input.promptText, /chat\/completions/);
        return {
          agentId: "bc-agent-1",
          runId: "run-1",
          agentUrl: "https://cursor.com/agents/bc-agent-1",
        };
      },
      createRun: async () => {
        throw new Error("createRun should not run on first turn");
      },
    },
  );

  assert.equal(result.status, "working");
  assert.equal(result.runId, "run-1");
  assert.equal(result.agentId, "bc-agent-1");
  assert.equal(result.content, null);
  assert.equal(result.toolOutcomes.length, 0);
  assert.equal(agentCalls.length, 1);

  const incident = db.documents.get("incidents/inc-1");
  assert.equal(incident.cursorAgentId, "bc-agent-1");
  assert.equal(incident.supportAgentRun.runId, "run-1");
  assert.equal(incident.supportAgentRun.status, "working");

  const supportMsgs = [...db.documents.entries()].filter(
    ([path, data]) =>
      path.includes("/threads/support/messages/") &&
      data?.working === true &&
      data?.text === SUPPORT_AGENT_WORKING_TEXT,
  );
  assert.equal(supportMsgs.length, 1);
});

test("follow-up turn uses createRun when cursorAgentId exists", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db, {
    incident: {
      cursorAgentId: "bc-existing",
      activeSessionOpsSummonId: "summon-1",
    },
  });
  let id = 0;
  let createRunCalls = 0;

  const result = await supportAgentTurnHandler(
    db,
    {
      incidentId: "inc-1",
      uid: "reporter-1",
      text: "Still blank.",
      summonId: "summon-1",
    },
    {
      ...cursorDepsBase,
      now: () => new Date("2026-07-26T00:00:00.000Z"),
      generateId: () => `id-${(id += 1)}`,
      consumeSummon: async () => ({ ok: true }),
      consumeTurn: async () => ({ ok: true }),
      createAgent: async () => {
        throw new Error("createAgent should not run");
      },
      createRun: async (input) => {
        createRunCalls += 1;
        assert.equal(input.agentId, "bc-existing");
        return { runId: "run-2" };
      },
    },
  );

  assert.equal(createRunCalls, 1);
  assert.equal(result.runId, "run-2");
  assert.equal(result.status, "working");
});

test("overlapping working run throws SESSION_OPS_AGENT_BUSY", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db, {
    incident: {
      supportAgentRun: {
        runId: "run-open",
        status: "working",
        startedAt: "2026-07-26T00:00:00.000Z",
      },
    },
  });
  let id = 0;

  await assert.rejects(
    () =>
      supportAgentTurnHandler(
        db,
        {
          incidentId: "inc-1",
          uid: "reporter-1",
          text: "another",
        },
        {
          ...cursorDepsBase,
          now: () => new Date("2026-07-26T00:00:00.000Z"),
          generateId: () => `id-${(id += 1)}`,
          createAgent: async () => ({ agentId: "x", runId: "y" }),
        },
      ),
    (error) => error.message === SESSION_OPS_AGENT_BUSY,
  );
});

test("Cursor failure releases claim without charging a turn", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db);
  let id = 0;
  let turnCharges = 0;

  await assert.rejects(
    () =>
      supportAgentTurnHandler(
        db,
        {
          incidentId: "inc-1",
          uid: "reporter-1",
          text: "please fail",
        },
        {
          ...cursorDepsBase,
          now: () => new Date("2026-07-26T00:00:00.000Z"),
          generateId: () => `id-${(id += 1)}`,
          consumeTurn: async () => {
            turnCharges += 1;
            return { ok: true };
          },
          createAgent: async () => {
            throw new Error("network down");
          },
        },
      ),
    (error) => error.message === "SESSION_OPS_AGENT_FAILED",
  );

  assert.equal(turnCharges, 0);
  assert.equal(
    db.documents.get("incidents/inc-1").supportAgentRun.status,
    "failed",
  );
  assert.equal(
    db.documents.get("incidents/inc-1").supportAgentRun.terminalStatus,
    "RELEASED",
  );
});

test("second concurrent claim loses the busy race", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db);
  let id = 0;
  let createCalls = 0;

  const deps = {
    ...cursorDepsBase,
    now: () => new Date("2026-07-26T00:00:00.000Z"),
    generateId: () => `id-${(id += 1)}`,
    createAgent: async () => {
      createCalls += 1;
      return {
        agentId: "bc-1",
        runId: `run-${createCalls}`,
        agentUrl: "https://cursor.com/agents/bc-1",
      };
    },
  };

  const first = await supportAgentTurnHandler(
    db,
    { incidentId: "inc-1", uid: "reporter-1", text: "first" },
    deps,
  );
  assert.equal(first.status, "working");

  await assert.rejects(
    () =>
      supportAgentTurnHandler(
        db,
        { incidentId: "inc-1", uid: "reporter-1", text: "second" },
        deps,
      ),
    (error) => error.message === SESSION_OPS_AGENT_BUSY,
  );
  assert.equal(createCalls, 1);
});

test("missing mcp config throws SESSION_OPS_AGENT_MISCONFIGURED", async () => {
  const db = createInMemoryFirestore();
  seedIncidentDb(db);
  let id = 0;

  await assert.rejects(
    () =>
      supportAgentTurnHandler(
        db,
        {
          incidentId: "inc-1",
          uid: "reporter-1",
          text: "hello",
        },
        {
          apiKey: "cursor-key",
          mcpUrl: "",
          mcpAuthSecret: "secret",
          now: () => new Date("2026-07-26T00:00:00.000Z"),
          generateId: () => `id-${(id += 1)}`,
          resolveCaps: () => getSessionOpsCaps("free"),
        },
      ),
    (error) => error.message === "SESSION_OPS_AGENT_MISCONFIGURED",
  );
});
