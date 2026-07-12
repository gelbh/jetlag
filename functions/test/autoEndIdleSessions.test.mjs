import test from "node:test";
import assert from "node:assert/strict";
import {
  autoEndIdleSession,
  computeIdleCutoffIso,
  getEffectiveLastActiveAt,
  isIdleActiveSession,
  selectIdleActiveSessions,
} from "../session/autoEndIdleSessions.mjs";

function fakeSnapshot(id, data) {
  return {
    id,
    data: () => data,
  };
}

test("getEffectiveLastActiveAt falls back to createdAt", () => {
  assert.equal(
    getEffectiveLastActiveAt({
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(
    getEffectiveLastActiveAt({
      createdAt: "2026-01-01T00:00:00.000Z",
      lastActiveAt: "2026-06-01T00:00:00.000Z",
    }),
    "2026-06-01T00:00:00.000Z",
  );
});

test("isIdleActiveSession ignores ended sessions", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  assert.equal(
    isIdleActiveSession(
      { status: "active", lastActiveAt: "2026-05-01T00:00:00.000Z" },
      cutoff,
    ),
    true,
  );
  assert.equal(
    isIdleActiveSession(
      {
        status: "ended",
        endedAt: "2026-05-01T00:00:00.000Z",
        lastActiveAt: "2026-05-01T00:00:00.000Z",
      },
      cutoff,
    ),
    false,
  );
});

test("computeIdleCutoffIso subtracts idle hours", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");
  assert.equal(
    computeIdleCutoffIso(now, 24),
    "2026-07-09T12:00:00.000Z",
  );
});

test("selectIdleActiveSessions deduplicates indexed and legacy candidates", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";
  const indexed = [
    fakeSnapshot("idle-1", {
      status: "active",
      lastActiveAt: "2026-05-01T00:00:00.000Z",
    }),
  ];
  const legacy = [
    fakeSnapshot("idle-1", {
      status: "active",
      createdAt: "2026-05-01T00:00:00.000Z",
    }),
    fakeSnapshot("idle-2", {
      status: "active",
      createdAt: "2026-05-02T00:00:00.000Z",
    }),
  ];

  const selected = selectIdleActiveSessions(indexed, legacy, cutoff, 5);
  assert.deepEqual(
    selected.map((snapshot) => snapshot.id),
    ["idle-1", "idle-2"],
  );
});

test("autoEndIdleSession ends session and deletes session code", async () => {
  const updates = [];
  const deletedCodes = [];
  const sessionDoc = {
    data: () => ({ code: "ABCD", status: "active" }),
    ref: {
      update: async (payload) => {
        updates.push(payload);
      },
    },
  };
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        delete: async () => {
          deletedCodes.push({ name, id });
        },
      }),
    }),
  };

  await autoEndIdleSession(db, sessionDoc);

  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "ended");
  assert.equal(typeof updates[0].endedAt, "string");
  assert.deepEqual(deletedCodes, [{ name: "sessionCodes", id: "ABCD" }]);
});
