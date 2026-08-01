import test from "node:test";
import assert from "node:assert/strict";
import {
  REPAIR_NOT_MEMBER,
  repairGhostHostHandler,
} from "../session/repairGhostHost.mjs";

function mockSessionDb({ sessionData, sessionExists = true, updates }) {
  const sessionRef = {
    id: "sess-1",
    get: async () => ({
      exists: sessionExists,
      data: () => sessionData,
      ref: sessionRef,
    }),
  };

  return {
    collection: (name) => {
      if (name === "sessions") {
        return {
          doc: () => sessionRef,
        };
      }
      throw new Error(`unexpected ${name}`);
    },
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
  };
}

test("repairGhostHostHandler promotes when hostUid is missing from members", async () => {
  const updates = [];
  const sessionData = {
    hostUid: "host-old",
    status: "active",
    memberUids: ["uid-new", "s1"],
    memberRoles: { "uid-new": "seeker", s1: "seeker" },
  };
  const db = mockSessionDb({ sessionData, updates });

  const result = await repairGhostHostHandler(db, "uid-new", "sess-1");
  assert.deepEqual(result, { action: "repaired", newHostUid: "s1" });
  assert.deepEqual(updates, [{ hostUid: "s1" }]);
});

test("repairGhostHostHandler noops when host is still a member", async () => {
  const updates = [];
  const sessionData = {
    hostUid: "host",
    status: "active",
    memberUids: ["host", "s1"],
    memberRoles: { host: "seeker", s1: "seeker" },
  };
  const db = mockSessionDb({ sessionData, updates });

  const result = await repairGhostHostHandler(db, "s1", "sess-1");
  assert.deepEqual(result, { action: "noop", hostUid: "host" });
  assert.deepEqual(updates, []);
});

test("repairGhostHostHandler rejects non-members", async () => {
  const updates = [];
  const sessionData = {
    hostUid: "host-old",
    status: "active",
    memberUids: ["s1"],
    memberRoles: { s1: "seeker" },
  };
  const db = mockSessionDb({ sessionData, updates });

  await assert.rejects(
    () => repairGhostHostHandler(db, "outsider", "sess-1"),
    (error) => error instanceof Error && error.message === REPAIR_NOT_MEMBER,
  );
});
