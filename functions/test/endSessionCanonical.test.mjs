import test from "node:test";
import assert from "node:assert/strict";
import { endSessionCanonical } from "../session/endSessionCanonical.mjs";

test("endSessionCanonical writes outcome and deletes code", async () => {
  const updates = [];
  const deleted = [];
  const sessionDoc = {
    data: () => ({ code: "ABCD", status: "active" }),
    ref: { update: async (p) => updates.push(p) },
  };
  const db = {
    collection: (name) => ({
      doc: (id) => ({ delete: async () => deleted.push({ name, id }) }),
    }),
  };
  await endSessionCanonical(db, sessionDoc, { gameOutcome: "abandoned" });
  assert.equal(updates[0].status, "ended");
  assert.equal(updates[0].gameOutcome, "abandoned");
  assert.deepEqual(deleted, [{ name: "sessionCodes", id: "ABCD" }]);
});

test("endSessionCanonical preserves existing found outcome", async () => {
  const updates = [];
  const sessionDoc = {
    data: () => ({ code: "ABCD", status: "active", gameOutcome: "found" }),
    ref: { update: async (p) => updates.push(p) },
  };
  const db = { collection: () => ({ doc: () => ({ delete: async () => {} }) }) };
  await endSessionCanonical(db, sessionDoc, { gameOutcome: "ended_early" });
  assert.equal(updates[0].gameOutcome, "found");
});
