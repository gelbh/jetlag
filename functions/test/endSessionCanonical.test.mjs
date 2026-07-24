import test from "node:test";
import assert from "node:assert/strict";
import { endSessionCanonical } from "../session/endSessionCanonical.mjs";

function mockDb({ sessionData, sessionExists = true, updates, deleted }) {
  const sessionRef = {
    update: async () => {
      throw new Error("update should go through transaction");
    },
  };

  return {
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({
          exists: sessionExists,
          data: () => sessionData,
        }),
        update: async (_ref, payload) => {
          updates.push(payload);
        },
      };
      await fn(tx);
    },
    collection: (name) => ({
      doc: (id) => ({
        delete: async () => deleted.push({ name, id }),
      }),
    }),
    _sessionRef: sessionRef,
  };
}

test("endSessionCanonical writes outcome and deletes code", async () => {
  const updates = [];
  const deleted = [];
  const db = mockDb({
    sessionData: { code: "ABCD", status: "active" },
    updates,
    deleted,
  });
  const sessionDoc = { ref: db._sessionRef, data: () => ({ code: "ABCD" }) };

  await endSessionCanonical(db, sessionDoc, { gameOutcome: "abandoned" });
  assert.equal(updates[0].status, "ended");
  assert.equal(updates[0].gameOutcome, "abandoned");
  assert.deepEqual(deleted, [{ name: "sessionCodes", id: "ABCD" }]);
});

test("endSessionCanonical preserves existing found outcome from fresh read", async () => {
  const updates = [];
  const deleted = [];
  const db = mockDb({
    sessionData: { code: "ABCD", status: "active", gameOutcome: "found" },
    updates,
    deleted,
  });
  const sessionDoc = {
    ref: db._sessionRef,
    data: () => ({ code: "ABCD", status: "active" }),
  };

  await endSessionCanonical(db, sessionDoc, { gameOutcome: "ended_early" });
  assert.equal(updates[0].gameOutcome, "found");
});

test("endSessionCanonical no-ops session update when already ended", async () => {
  const updates = [];
  const deleted = [];
  const db = mockDb({
    sessionData: {
      code: "ABCD",
      status: "ended",
      endedAt: "2026-01-01T00:00:00.000Z",
      gameOutcome: "found",
    },
    updates,
    deleted,
  });
  const sessionDoc = { ref: db._sessionRef, data: () => ({}) };

  await endSessionCanonical(db, sessionDoc, { gameOutcome: "abandoned" });
  assert.equal(updates.length, 0);
  assert.deepEqual(deleted, [{ name: "sessionCodes", id: "ABCD" }]);
});

test("endSessionCanonical is idempotent when session document is missing", async () => {
  const updates = [];
  const deleted = [];
  const db = mockDb({
    sessionData: undefined,
    sessionExists: false,
    updates,
    deleted,
  });
  const sessionDoc = { ref: db._sessionRef, data: () => ({ code: "ABCD" }) };

  await endSessionCanonical(db, sessionDoc, { gameOutcome: "abandoned" });
  assert.equal(updates.length, 0);
  assert.equal(deleted.length, 0);
});
