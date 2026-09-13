import test from "node:test";
import assert from "node:assert/strict";
import {
  INCIDENT_INVALID_STATUS,
  INCIDENT_INVALID_TRANSITION,
  updateIncidentStatusHandler,
} from "../incident/updateIncidentStatus.mjs";
import { INCIDENT_NOT_FOUND } from "../incident/postIncidentMessage.mjs";

function mockDb(incident) {
  const messages = [];
  const docs = new Map();
  const notices = new Map();
  if (incident) {
    docs.set("inc-1", { ...incident });
  }
  return {
    messages,
    notices,
    collection(name) {
      if (name === "users") {
        return {
          doc(uid) {
            return {
              collection(sub) {
                assert.equal(sub, "incidentNotices");
                return {
                  doc(incidentId) {
                    return {
                      async set(payload, options) {
                        notices.set(`${uid}/${incidentId}`, {
                          payload,
                          options,
                        });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      assert.equal(name, "incidents");
      return {
        doc(id) {
          return {
            async get() {
              const data = docs.get(id);
              return {
                exists: data != null,
                data: () => data,
              };
            },
            async update(patch) {
              const current = docs.get(id);
              assert.ok(current);
              docs.set(id, { ...current, ...patch });
            },
            collection(sub) {
              assert.equal(sub, "messages");
              return {
                doc() {
                  return {
                    async set(payload) {
                      messages.push(payload);
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("updateIncidentStatusHandler resolves open incident", async () => {
  const db = mockDb({ status: "open" });
  const result = await updateIncidentStatusHandler(db, {
    incidentId: "inc-1",
    status: "resolved",
    uid: "admin-1",
  });
  assert.equal(result.status, "resolved");
  assert.equal(db.messages.length, 1);
  assert.match(db.messages[0].text, /resolved/i);
});

test("updateIncidentStatusHandler reopens dismissed incident", async () => {
  const db = mockDb({ status: "dismissed" });
  const result = await updateIncidentStatusHandler(db, {
    incidentId: "inc-1",
    status: "chatting",
    uid: "admin-1",
  });
  assert.equal(result.status, "chatting");
});

test("updateIncidentStatusHandler rejects illegal reopen", async () => {
  const db = mockDb({ status: "open" });
  await assert.rejects(
    () =>
      updateIncidentStatusHandler(db, {
        incidentId: "inc-1",
        status: "chatting",
        uid: "admin-1",
      }),
    (error) => error.message === INCIDENT_INVALID_TRANSITION,
  );
});

test("updateIncidentStatusHandler rejects bad status", async () => {
  const db = mockDb({ status: "open" });
  await assert.rejects(
    () =>
      updateIncidentStatusHandler(db, {
        incidentId: "inc-1",
        status: "mitigating",
        uid: "admin-1",
      }),
    (error) => error.message === INCIDENT_INVALID_STATUS,
  );
});

test("updateIncidentStatusHandler rejects missing incident", async () => {
  const db = mockDb(null);
  await assert.rejects(
    () =>
      updateIncidentStatusHandler(db, {
        incidentId: "missing",
        status: "resolved",
        uid: "admin-1",
      }),
    (error) => error.message === INCIDENT_NOT_FOUND,
  );
});

test("resolve with reporterUid calls notifyReporterResolved once", async () => {
  const db = mockDb({ status: "open", reporterUid: "u1" });
  const notifyCalls = [];
  const result = await updateIncidentStatusHandler(
    db,
    {
      incidentId: "inc-1",
      status: "resolved",
      uid: "admin-1",
    },
    {
      notifyReporterResolved: async (args) => {
        notifyCalls.push(args);
      },
    },
  );
  assert.equal(result.status, "resolved");
  assert.equal(notifyCalls.length, 1);
  assert.deepEqual(notifyCalls[0], {
    incidentId: "inc-1",
    reporterUid: "u1",
  });
});

test("dismiss does not call notifyReporterResolved", async () => {
  const db = mockDb({ status: "open", reporterUid: "u1" });
  const notifyCalls = [];
  const result = await updateIncidentStatusHandler(
    db,
    {
      incidentId: "inc-1",
      status: "dismissed",
      uid: "admin-1",
    },
    {
      notifyReporterResolved: async (args) => {
        notifyCalls.push(args);
      },
    },
  );
  assert.equal(result.status, "dismissed");
  assert.equal(notifyCalls.length, 0);
});

test("notify throw does not reject handler", async () => {
  const db = mockDb({ status: "open", reporterUid: "u1" });
  const result = await updateIncidentStatusHandler(
    db,
    {
      incidentId: "inc-1",
      status: "resolved",
      uid: "admin-1",
    },
    {
      notifyReporterResolved: async () => {
        throw new Error("notify boom");
      },
    },
  );
  assert.equal(result.status, "resolved");
});
