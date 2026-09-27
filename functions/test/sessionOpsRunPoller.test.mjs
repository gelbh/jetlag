import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_OPS_RUN_FAILURE_TEXT,
  finalizeSessionOpsRunIfReady,
  pollSessionOpsRuns,
} from "../incident/sessionOpsRunPoller.mjs";
import { SUPPORT_AGENT_WORKING_TEXT } from "../incident/supportAgentTurn.mjs";

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
      },
    },
    "incidents/inc-1/threads/support/messages/work-1": {
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
  assert.equal(
    db.documents.get("incidents/inc-1/threads/support/messages/work-1").working,
    false,
  );
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
      },
    },
  });
  let id = 0;
  await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    {
      apiKey: "k",
      now: () => new Date("2026-07-26T01:00:00.000Z"),
      generateId: () => `msg-${(id += 1)}`,
      getRun: async () => ({ status: "ERROR", text: null }),
    },
  );
  const incident = db.documents.get("incidents/inc-1");
  assert.equal(incident.supportAgentRun.status, "failed");
  assert.ok(
    [...db.documents.values()].some(
      (data) => data?.text === SESSION_OPS_RUN_FAILURE_TEXT,
    ),
  );
});

test("finalizeSessionOpsRunIfReady noops while still running", async () => {
  const db = createInMemoryFirestore({
    "incidents/inc-1": {
      supportAgentRun: {
        runId: "run-1",
        agentId: "bc-1",
        status: "working",
      },
    },
  });
  const result = await finalizeSessionOpsRunIfReady(
    db,
    "inc-1",
    db.documents.get("incidents/inc-1"),
    {
      apiKey: "k",
      getRun: async () => ({ status: "RUNNING", text: null }),
    },
  );
  assert.equal(result.handled, false);
  assert.equal(result.reason, "still_running");
});

test("pollSessionOpsRuns walks listed active incidents", async () => {
  const db = createInMemoryFirestore();
  const results = await pollSessionOpsRuns(db, {
    apiKey: "k",
    listActiveIncidents: async () => [
      {
        id: "inc-1",
        data: {
          supportAgentRun: {
            runId: "run-1",
            agentId: "bc-1",
            status: "working",
          },
        },
      },
    ],
    getRun: async () => ({ status: "FINISHED", text: "All good." }),
    now: () => new Date("2026-07-26T01:00:00.000Z"),
    generateId: () => "final-1",
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].handled, true);
});
