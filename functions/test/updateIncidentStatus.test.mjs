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
  if (incident) {
    docs.set("inc-1", { ...incident });
  }
  return {
    messages,
    collection(name) {
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
