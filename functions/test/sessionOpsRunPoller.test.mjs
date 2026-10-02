import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeSessionOpsRunIfReady,
  pollSessionOpsRuns,
  SESSION_OPS_RUN_FAILURE_TEXT,
} from "../incident/sessionOpsRunPoller.mjs";
import { SUPPORT_AGENT_WORKING_TEXT } from "../incident/sessionOpsThread.mjs";

function createInMemoryFirestore(seed = {}) {
  const documents = new Map(Object.entries(seed));

  function createDocRef(parts) {
    const path = parts.join("/");
    return {
      path,
      id: parts[parts.length - 1],
      get: async () => {
        const data = documents.get(path);
        return { exists: data !== undefined, data: () => data };
      },
      set: async (data, options = {}) => {
        if (options.merge) {
          documents.set(path, { ...(documents.get(path) ?? {}), ...data });
        } else {
          documents.set(path, { ...data });
        }
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
    async runTransaction(fn) {
      const transaction = {
        get: async (ref) => ref.get(),
        set: async (ref, data, options) => ref.set(data, options),
      };
      return fn(transaction);
    },
  };
}

test("finalizeSessionOpsRunIfReady persists FINISHED text and clears working", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      cursorAgentId: "bc-1",
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        workingMessageId: "work-1",
        summonId: "sum-1",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
    "incidents/inc-1/threads/support/messages/work-1": {
      id: "work-1",
      text: SUPPORT_AGENT_WORKING_TEXT,
      working: true,
      sender: "ops_agent",
    },
    "incidents/inc-1/messages/work-1": {
      id: "work-1",
      text: SUPPORT_AGENT_WORKING_TEXT,
      working: true,
      sender: "ops_agent",
    },
  });

  let id = 0;
  const result = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    {
      apiKey: "k",
      now: () => new Date("2026-07-26T01:00:00.000Z"),
      generateId: () => `msg-${(id += 1)}`,
      getRun: async () => ({
        status: "FINISHED",
        text: "Soft-reload sent to clients.",
      }),
    },
  );

  assert.equal(result.handled, true);
  assert.equal(result.status, "FINISHED");
  const incident = db.documents.get("incidents/inc-1");
  assert.equal(incident.supportAgentRun.status, "finished");
  assert.equal(db.documents.get("incidents/inc-1/threads/support/messages/work-1").working, false);
  assert.equal(db.documents.get("incidents/inc-1/messages/work-1").working, false);
  assert.ok(
    [...db.documents.values()].some(
      (data) =>
        data?.sender === "ops_agent" &&
        data?.text === "Soft-reload sent to clients." &&
        data?.working === false,
    ),
  );
});

test("finalizeSessionOpsRunIfReady writes canned failure on ERROR", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      cursorAgentId: "bc-1",
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
  });
  let id = 0;
  await finalizeSessionOpsRunIfReady(db, "inc-1", db.documents.get("incidents/inc-1"), {
    apiKey: "k",
    now: () => new Date("2026-07-26T01:00:00.000Z"),
    generateId: () => `msg-${(id += 1)}`,
    getRun: async () => ({ status: "ERROR", text: null }),
  });
  const incident = db.documents.get("incidents/inc-1");
  assert.equal(incident.supportAgentRun.status, "failed");
  assert.ok([...db.documents.values()].some((data) => data?.text === SESSION_OPS_RUN_FAILURE_TEXT));
});

test("finalizeSessionOpsRunIfReady noops while still running", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:55:00.000Z",
      },
    },
  });
  const result = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    {
      apiKey: "k",
      now: () => new Date("2026-07-26T01:00:00.000Z"),
      getRun: async () => ({ status: "RUNNING", text: null }),
    },
  );
  assert.equal(result.handled, false);
  assert.equal(result.reason, "still_running");
});

test("finalizeSessionOpsRunIfReady refuses stale runId after claim", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-old",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
  });
  const result = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    {
      supportAgentRun: {
        runId: "run-old",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
    {
      apiKey: "k",
      now: () => new Date("2026-07-26T01:00:00.000Z"),
      generateId: () => "final-1",
      getRun: async () => {
        // Newer turn claimed the incident before we finalize.
        db.documents.set("incidents/inc-1", {
          supportAgentRun: {
            runId: "run-new",
            agentId: "bc-1",
            status: "working",
            startedAt: "2026-07-26T00:59:00.000Z",
          },
        });
        return { status: "FINISHED", text: "stale text" };
      },
    },
  );
  assert.equal(result.handled, false);
  assert.equal(result.reason, "stale_run");
  assert.equal(db.documents.get("incidents/inc-1").supportAgentRun.runId, "run-new");
  assert.equal(db.documents.get("incidents/inc-1").supportAgentRun.status, "working");
});

test("finalizeSessionOpsRunIfReady second tick is noop after claim", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
  });
  let id = 0;
  const deps = {
    apiKey: "k",
    now: () => new Date("2026-07-26T01:00:00.000Z"),
    generateId: () => `msg-${(id += 1)}`,
    getRun: async () => ({ status: "FINISHED", text: "Done once." }),
  };
  const first = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    deps,
  );
  const second = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    deps,
  );
  assert.equal(first.handled, true);
  assert.equal(second.handled, false);
  assert.equal(second.reason, "not_active");
  const threadFinals = [...db.documents.entries()].filter(
    ([path, data]) => path.includes("/threads/support/messages/") && data?.text === "Done once.",
  );
  assert.equal(threadFinals.length, 1);
});

test("finalizeSessionOpsRunIfReady ages out stuck runs", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:00:00.000Z",
      },
    },
  });
  let id = 0;
  const result = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    {
      apiKey: "k",
      now: () => new Date("2026-07-26T01:00:00.000Z"),
      generateId: () => `msg-${(id += 1)}`,
      maxAgeMs: 15 * 60 * 1000,
      getRun: async () => ({ status: "RUNNING", text: null }),
    },
  );
  assert.equal(result.handled, true);
  assert.equal(result.status, "EXPIRED");
  assert.equal(db.documents.get("incidents/inc-1").supportAgentRun.status, "failed");
});

test("pollSessionOpsRuns walks listed active incidents", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
  });
  const results = await pollSessionOpsRuns(db, {
    apiKey: "k",
    listActiveIncidents: async () => [
      {
        id: "inc-1",
        data: db.documents.get("incidents/inc-1"),
      },
    ],
    getRun: async () => ({ status: "FINISHED", text: "All good." }),
    now: () => new Date("2026-07-26T01:00:00.000Z"),
    generateId: () => "final-1",
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].handled, true);
});

test("pollSessionOpsRuns isolates per-incident errors", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-boom": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
    "incidents/inc-ok": {
      supportAgentRun: {
        runId: "run-2",
        agentId: "bc-2",
        status: "working",
        startedAt: "2026-07-26T00:50:00.000Z",
      },
    },
  });
  let id = 0;
  const results = await pollSessionOpsRuns(db, {
    apiKey: "k",
    listActiveIncidents: async () => [
      {
        id: "inc-boom",
        data: db.documents.get("incidents/inc-boom"),
      },
      {
        id: "inc-ok",
        data: db.documents.get("incidents/inc-ok"),
      },
    ],
    getRun: async ({ runId }) => {
      if (runId === "run-1") {
        throw new Error("cursor down");
      }
      return { status: "FINISHED", text: "ok" };
    },
    now: () => new Date("2026-07-26T01:00:00.000Z"),
    generateId: () => `final-${(id += 1)}`,
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].reason, "error");
  assert.equal(results[1].handled, true);
});
