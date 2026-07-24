import test from "node:test";
import assert from "node:assert/strict";
import {
  isOrphanSession,
  selectOrphanCodeDocs,
  sweepOrphanSessionCodes,
} from "../session/orphanSessionCodes.mjs";

test("isOrphanSession true when session missing", () => {
  assert.equal(isOrphanSession(null), true);
});

test("isOrphanSession true when session ended", () => {
  assert.equal(isOrphanSession({ status: "ended" }), true);
});

test("isOrphanSession false for live active session", () => {
  assert.equal(isOrphanSession({ status: "active" }), false);
});

test("selectOrphanCodeDocs respects limit", () => {
  const selected = selectOrphanCodeDocs(
    [
      { codeData: { sessionId: "a" }, sessionData: null },
      { codeData: { sessionId: "b" }, sessionData: { status: "ended" } },
      { codeData: { sessionId: "c" }, sessionData: { status: "active" } },
    ],
    1,
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].codeData.sessionId, "a");
});

test("sweepOrphanSessionCodes deletes orphans only", async () => {
  const deleted = [];
  const sessions = {
    live: { status: "active" },
    dead: { status: "ended" },
  };
  const codes = [
    {
      id: "ORPH",
      data: () => ({ sessionId: "missing" }),
      ref: { delete: async () => deleted.push("ORPH") },
    },
    {
      id: "DEAD",
      data: () => ({ sessionId: "dead" }),
      ref: { delete: async () => deleted.push("DEAD") },
    },
    {
      id: "LIVE",
      data: () => ({ sessionId: "live" }),
      ref: { delete: async () => deleted.push("LIVE") },
    },
  ];

  const db = {
    collection: (name) => {
      if (name === "sessionCodes") {
        return {
          orderBy: () => ({
            limit: () => ({
              get: async () => ({ docs: codes }),
            }),
          }),
        };
      }
      if (name === "sessions") {
        return {
          doc: (id) => ({
            get: async () => ({
              exists: Object.hasOwn(sessions, id),
              data: () => sessions[id],
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };

  const orphansDeleted = await sweepOrphanSessionCodes(db, { limit: 100 });
  assert.equal(orphansDeleted, 2);
  assert.deepEqual(deleted.sort(), ["DEAD", "ORPH"]);
});
