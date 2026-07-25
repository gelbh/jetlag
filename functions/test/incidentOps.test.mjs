import test from "node:test";
import assert from "node:assert/strict";
import { HttpsError } from "firebase-functions/v2/https";
import { requireAdminAuth } from "../admin/adminAccess.mjs";
import { INCIDENT_RATE_LIMITED } from "../incident/createIncident.mjs";
import {
  INCIDENT_FORBIDDEN,
  postIncidentMessageHandler,
} from "../incident/postIncidentMessage.mjs";
import {
  applyIncidentMitigationHandler,
  INCIDENT_INVALID_MITIGATION,
  INCIDENT_NO_SESSION,
  INCIDENT_REPORTER_NOT_MEMBER,
} from "../incident/applyIncidentMitigation.mjs";
import {
  compareAppVersions,
  publishIncidentHotfixHandler,
} from "../incident/publishIncidentHotfix.mjs";

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
    "sess-2": { status: "active", memberUids: ["reporter-1"] },
  },
  activeCodes = {
    ABCD: { status: "active", sessionId: "sess-1" },
    EFGH: { status: "active", sessionId: "sess-2" },
  },
} = {}) {
  const incidents = new Map([["inc-1", { ...incident }]]);
  const sessionDocs = new Map(
    Object.entries(sessions).map(([id, data]) => [id, { ...data }]),
  );
  const codeDocs = new Map(
    Object.entries(activeCodes).map(([id, data]) => [id, { ...data }]),
  );
  const appConfig = new Map();
  const messages = [];
  const batchOps = [];

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
        assert.equal(name, "messages");
        return {
          doc: (msgId) => ({
            set: async (data) => {
              messages.push({ incidentId: id, msgId, ...data });
            },
          }),
        };
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
      if (name === "appConfig") {
        return {
          doc: (id) => ({
            set: async (data, options) => {
              const current = appConfig.get(id) ?? {};
              appConfig.set(
                id,
                options?.merge ? { ...current, ...data } : { ...data },
              );
            },
            get: async () => ({
              exists: appConfig.has(id),
              data: () => appConfig.get(id),
            }),
          }),
        };
      }
      if (name === "sessionCodes") {
        return {
          where: (field, op, value) => {
            assert.equal(field, "status");
            assert.equal(op, "==");
            assert.equal(value, "active");
            return {
              orderBy: () => ({
                limit: (n) => ({
                  startAfter: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                  }),
                  get: async () => {
                    const docs = [...codeDocs.entries()]
                      .filter(([, data]) => data.status === "active")
                      .slice(0, n)
                      .map(([id, data]) => ({
                        id,
                        data: () => data,
                      }));
                    return { empty: docs.length === 0, docs };
                  },
                }),
              }),
            };
          },
          doc: (id) => ({
            get: async () => ({
              exists: codeDocs.has(id),
              data: () => codeDocs.get(id),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    batch: () => {
      const ops = [];
      return {
        update: (ref, data) => {
          ops.push({ ref, data });
          batchOps.push({ ref, data });
        },
        commit: async () => {
          for (const op of ops) {
            await op.ref.update(op.data);
          }
        },
      };
    },
    _incidents: incidents,
    _sessions: sessionDocs,
    _appConfig: appConfig,
    _messages: messages,
    _batchOps: batchOps,
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

test("requireAdminAuth rejects non-admin for mitigate/hotfix gates", () => {
  assert.throws(
    () =>
      requireAdminAuth({
        uid: "user-1",
        token: { email: "other@example.com", email_verified: true },
      }),
    (error) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "permission-denied");
      return true;
    },
  );
});

test("postIncidentMessageHandler advances open → chatting for reporter", async () => {
  const db = mockOpsDb();
  const result = await postIncidentMessageHandler(
    db,
    {
      incidentId: "inc-1",
      uid: "reporter-1",
      isAdmin: false,
      text: "still broken",
    },
    baseDeps(),
  );

  assert.deepEqual(result, { messageId: "id-1" });
  assert.equal(db._incidents.get("inc-1").status, "chatting");
  assert.equal(db._messages[0].sender, "player");
  assert.equal(db._messages[0].kind, "chat");
  assert.equal(db._messages[0].text, "still broken");
});

test("postIncidentMessageHandler forbids non-reporter non-admin", async () => {
  const db = mockOpsDb();
  await assert.rejects(
    postIncidentMessageHandler(
      db,
      {
        incidentId: "inc-1",
        uid: "stranger",
        isAdmin: false,
        text: "hello",
      },
      baseDeps(),
    ),
    (error) => error.message === INCIDENT_FORBIDDEN,
  );
});

test("postIncidentMessageHandler enforces the rate limit", async () => {
  const db = mockOpsDb();
  await assert.rejects(
    postIncidentMessageHandler(
      db,
      {
        incidentId: "inc-1",
        uid: "reporter-1",
        isAdmin: false,
        text: "still broken",
      },
      baseDeps({
        rateLimit: async () => ({ allowed: false, retryAfterMs: 1000 }),
      }),
    ),
    (error) => error.message === INCIDENT_RATE_LIMITED,
  );
  assert.equal(db._messages.length, 0);
});

test("applyIncidentMitigationHandler soft_reload writes session opsMitigation", async () => {
  const db = mockOpsDb();
  const result = await applyIncidentMitigationHandler(
    db,
    {
      incidentId: "inc-1",
      type: "soft_reload",
      uid: "admin-1",
      note: "try refresh",
    },
    baseDeps(),
  );

  assert.equal(result.type, "soft_reload");
  const session = db._sessions.get("sess-1");
  assert.equal(session.opsMitigation.type, "soft_reload");
  assert.equal(session.opsMitigation.incidentId, "inc-1");
  assert.equal(session.opsMitigation.appliedByUid, "admin-1");
  assert.equal(session.opsMitigation.note, "try refresh");
  // Soft reload keeps status (does not force mitigating).
  assert.equal(db._incidents.get("inc-1").status, "open");
  assert.equal(db._messages[0].kind, "mitigation");
  assert.equal(db._incidents.get("inc-1").mitigations.length, 1);
});

test("applyIncidentMitigationHandler reset_board delegates to moderate", async () => {
  const db = mockOpsDb();
  const moderated = [];
  await applyIncidentMitigationHandler(
    db,
    { incidentId: "inc-1", type: "reset_board", uid: "admin-1" },
    baseDeps({
      moderate: async (sessionId, action, adminUid) => {
        moderated.push({ sessionId, action, adminUid });
      },
    }),
  );

  assert.deepEqual(moderated, [
    { sessionId: "sess-1", action: "resetBoard", adminUid: "admin-1" },
  ]);
  assert.equal(db._incidents.get("inc-1").status, "mitigating");
  assert.equal(db._sessions.get("sess-1").opsMitigation.type, "reset_board");
});

test("applyIncidentMitigationHandler rejects unknown type", async () => {
  const db = mockOpsDb();
  await assert.rejects(
    applyIncidentMitigationHandler(
      db,
      { incidentId: "inc-1", type: "teleport", uid: "admin-1" },
      baseDeps(),
    ),
    (error) => error.message === INCIDENT_INVALID_MITIGATION,
  );
});

test("applyIncidentMitigationHandler rejects missing session doc", async () => {
  const db = mockOpsDb({
    incident: {
      status: "open",
      reporterUid: "reporter-1",
      sessionId: "missing-sess",
    },
    sessions: {},
  });
  await assert.rejects(
    applyIncidentMitigationHandler(
      db,
      { incidentId: "inc-1", type: "soft_reload", uid: "admin-1" },
      baseDeps(),
    ),
    (error) => error.message === INCIDENT_NO_SESSION,
  );
});

test("applyIncidentMitigationHandler rejects reporter not in session members", async () => {
  const db = mockOpsDb({
    sessions: {
      "sess-1": { status: "active", memberUids: ["other-player"] },
    },
  });
  await assert.rejects(
    applyIncidentMitigationHandler(
      db,
      { incidentId: "inc-1", type: "reset_board", uid: "admin-1" },
      baseDeps({
        moderate: async () => {
          throw new Error("should not moderate");
        },
      }),
    ),
    (error) => error.message === INCIDENT_REPORTER_NOT_MEMBER,
  );
});

test("publishIncidentHotfixHandler sets appConfig and fans out to sessions", async () => {
  const db = mockOpsDb();
  const result = await publishIncidentHotfixHandler(
    db,
    {
      incidentId: "inc-1",
      toVersion: "0.9.5.1",
      uid: "admin-1",
      graceSeconds: 45,
    },
    baseDeps(),
  );

  assert.deepEqual(result, {
    toVersion: "0.9.5.1",
    graceSeconds: 45,
    fannedOutSessionCount: 2,
  });

  const runtime = db._appConfig.get("runtime");
  assert.equal(runtime.requiredMinAppVersion, "0.9.5.1");
  assert.equal(runtime.hotfixGraceSeconds, 45);
  assert.equal(runtime.incidentId, "inc-1");
  assert.equal(runtime.updatedByUid, "admin-1");

  for (const sessionId of ["sess-1", "sess-2"]) {
    const session = db._sessions.get(sessionId);
    assert.equal(session.requiredMinAppVersion, "0.9.5.1");
    assert.equal(session.requiredMinAppVersionGraceSeconds, 45);
    assert.equal(session.requiredMinAppVersionSetAt, "2026-07-25T12:00:00.000Z");
  }

  const incident = db._incidents.get("inc-1");
  assert.equal(incident.status, "hotfix_pending");
  assert.equal(incident.hotfix.toVersion, "0.9.5.1");
  assert.equal(incident.hotfix.fromVersion, "0.9.5");
  assert.equal(db._messages[0].kind, "hotfix");
});

test("compareAppVersions treats missing fourth segment as zero", () => {
  assert.equal(compareAppVersions("0.9.5", "0.9.5.1"), -1);
  assert.equal(compareAppVersions("0.9.5.1", "0.9.6"), -1);
  assert.equal(compareAppVersions("0.9.5.1", "0.9.5.1"), 0);
});
