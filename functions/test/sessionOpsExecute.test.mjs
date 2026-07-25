import test from "node:test";
import assert from "node:assert/strict";
import {
  executeSessionOpsTool,
  SESSION_OPS_HOST_CONFIRM_REQUIRED,
  SESSION_OPS_SESSION_MISMATCH,
  SESSION_OPS_UNKNOWN_TOOL,
} from "../incident/sessionOpsExecute.mjs";

function applyUpdate(target, data) {
  for (const [key, value] of Object.entries(data)) {
    if (
      value &&
      typeof value === "object" &&
      value.methodName === "FieldValue.arrayUnion" &&
      Array.isArray(value.elements)
    ) {
      const existing = Array.isArray(target[key]) ? target[key] : [];
      target[key] = [...existing, ...value.elements];
      continue;
    }
    target[key] = value;
  }
}

function mockOpsDb({
  incident = {
    status: "open",
    reporterUid: "reporter-1",
    sessionId: "sess-1",
    diagnostics: { appVersion: "0.9.5" },
  },
  sessions = {
    "sess-1": { status: "active", memberUids: ["reporter-1"] },
  },
} = {}) {
  const incidents = new Map([["inc-1", { ...incident }]]);
  const sessionDocs = new Map(
    Object.entries(sessions).map(([id, data]) => [id, { ...data }]),
  );
  const messages = [];
  const toolAudits = [];

  function incidentRef(id) {
    return {
      id,
      get: async () => ({
        exists: incidents.has(id),
        data: () => incidents.get(id),
      }),
      update: async (data) => {
        const current = incidents.get(id) ?? {};
        applyUpdate(current, data);
        incidents.set(id, current);
      },
      set: async (data) => {
        incidents.set(id, { ...(incidents.get(id) ?? {}), ...data });
      },
      collection: (name) => {
        if (name === "messages") {
          return {
            doc: (msgId) => ({
              set: async (data) => {
                messages.push({ incidentId: id, msgId, ...data });
              },
            }),
          };
        }
        if (name === "toolAudit") {
          return {
            doc: (auditId) => ({
              set: async (data) => {
                toolAudits.push({ incidentId: id, auditId, ...data });
              },
            }),
          };
        }
        throw new Error(`unexpected incident subcollection ${name}`);
      },
    };
  }

  function sessionRef(id) {
    return {
      id,
      get: async () => ({
        exists: sessionDocs.has(id),
        data: () => sessionDocs.get(id),
      }),
      update: async (data) => {
        const current = sessionDocs.get(id) ?? {};
        applyUpdate(current, data);
        sessionDocs.set(id, current);
      },
    };
  }

  return {
    collection: (name) => {
      if (name === "incidents") {
        return { doc: (id) => incidentRef(id) };
      }
      if (name === "sessions") {
        return { doc: (id) => sessionRef(id) };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    _incidents: incidents,
    _sessions: sessionDocs,
    _messages: messages,
    _toolAudits: toolAudits,
  };
}

function baseDeps(overrides = {}) {
  let counter = 0;
  return {
    now: () => new Date("2026-07-25T12:00:00.000Z"),
    generateId: () => `id-${(counter += 1)}`,
    ...overrides,
  };
}

test("executeSessionOpsTool rejects wrong sessionId and audits", async () => {
  const db = mockOpsDb();
  await assert.rejects(
    executeSessionOpsTool(
      db,
      {
        incidentId: "inc-1",
        sessionId: "sess-evil",
        actorUid: "admin-1",
        tool: "soft_reload",
        args: {},
      },
      baseDeps(),
    ),
    (error) => error.message === SESSION_OPS_SESSION_MISMATCH,
  );
  assert.equal(db._toolAudits.length, 1);
  assert.equal(db._toolAudits[0].status, "rejected");
  assert.equal(db._toolAudits[0].code, SESSION_OPS_SESSION_MISMATCH);
  assert.equal(db._sessions.get("sess-1").opsMitigation, undefined);
});

test("executeSessionOpsTool rejects unknown tool and audits", async () => {
  const db = mockOpsDb();
  await assert.rejects(
    executeSessionOpsTool(
      db,
      {
        incidentId: "inc-1",
        sessionId: "sess-1",
        actorUid: "admin-1",
        tool: "teleport",
        args: {},
      },
      baseDeps(),
    ),
    (error) => error.message === SESSION_OPS_UNKNOWN_TOOL,
  );
  assert.equal(db._toolAudits[0].status, "rejected");
  assert.equal(db._toolAudits[0].code, SESSION_OPS_UNKNOWN_TOOL);
});

test("executeSessionOpsTool gates destructive tools without hostConfirmed", async () => {
  const db = mockOpsDb();
  const moderated = [];
  const result = await executeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      actorUid: "admin-1",
      tool: "reset_board",
      args: {},
      hostConfirmed: false,
    },
    baseDeps({
      moderate: async (sessionId, action, adminUid) => {
        moderated.push({ sessionId, action, adminUid });
      },
    }),
  );

  assert.equal(result.status, "host_confirm_required");
  assert.equal(result.code, SESSION_OPS_HOST_CONFIRM_REQUIRED);
  assert.equal(moderated.length, 0);
  assert.equal(db._toolAudits[0].status, "gated");
  assert.equal(db._toolAudits[0].code, SESSION_OPS_HOST_CONFIRM_REQUIRED);
  assert.equal(db._sessions.get("sess-1").opsMitigation, undefined);
});

test("executeSessionOpsTool soft_reload happy path writes opsMitigation + audit", async () => {
  const db = mockOpsDb();
  const result = await executeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      actorUid: "admin-1",
      tool: "soft_reload",
      args: { note: "try refresh" },
    },
    baseDeps(),
  );

  assert.equal(result.status, "ok");
  assert.equal(result.tool, "soft_reload");
  const session = db._sessions.get("sess-1");
  assert.equal(session.opsMitigation.type, "soft_reload");
  assert.equal(session.opsMitigation.incidentId, "inc-1");
  assert.equal(session.opsMitigation.note, "try refresh");
  assert.equal(db._toolAudits.length, 1);
  assert.equal(db._toolAudits[0].status, "accepted");
  assert.equal(db._messages[0].kind, "mitigation");
});

test("executeSessionOpsTool reset_board with hostConfirmed delegates to moderate", async () => {
  const db = mockOpsDb();
  const moderated = [];
  const result = await executeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      actorUid: "admin-1",
      tool: "reset_board",
      args: {},
      hostConfirmed: true,
    },
    baseDeps({
      moderate: async (sessionId, action, adminUid) => {
        moderated.push({ sessionId, action, adminUid });
      },
    }),
  );

  assert.equal(result.status, "ok");
  assert.deepEqual(moderated, [
    { sessionId: "sess-1", action: "resetBoard", adminUid: "admin-1" },
  ]);
  assert.equal(db._toolAudits[0].status, "accepted");
});
