import assert from "node:assert/strict";
import test from "node:test";
import {
  autoEndIdleSession,
  computeIdleCutoffIso,
  getEffectiveLastActiveAt,
  isIdleActiveSession,
  selectIdleActiveSessions,
} from "../session/autoEndIdleSessions.mjs";
import { uuidFromSeed } from "../lib/posthog.mjs";

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
    isIdleActiveSession({ status: "active", lastActiveAt: "2026-05-01T00:00:00.000Z" }, cutoff),
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
  assert.equal(computeIdleCutoffIso(now, 24), "2026-07-09T12:00:00.000Z");
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

function createEndSessionDb(sessionData) {
  const updates = [];
  const deletedCodes = [];
  const db = {
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({ exists: true, data: () => sessionData }),
        update: async (_ref, payload) => {
          updates.push(payload);
        },
        delete: async (ref) => {
          deletedCodes.push(ref);
        },
      };
      return fn(tx);
    },
    collection: (name) => ({
      doc: (id) => ({ name, id }),
    }),
  };
  return { db, updates, deletedCodes };
}

test("autoEndIdleSession ends session and deletes session code", async () => {
  const sessionData = { code: "ABCD", status: "active" };
  const { db, updates, deletedCodes } = createEndSessionDb(sessionData);
  const sessionDoc = {
    data: () => sessionData,
    ref: {},
  };
  const captures = [];
  const captureImpl = {
    capture: async (payload) => {
      captures.push(payload);
    },
    shutdown: async () => {},
  };

  await autoEndIdleSession(db, sessionDoc, {
    posthogApiKey: "phk_test",
    captureImpl,
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "ended");
  assert.equal(updates[0].gameOutcome, "abandoned");
  assert.equal(typeof updates[0].endedAt, "string");
  assert.deepEqual(deletedCodes, [{ name: "sessionCodes", id: "ABCD" }]);
  assert.equal(captures.length, 0, "missing hostUid skips capture");
});

test("autoEndIdleSession captures session_ended abandoned for host", async () => {
  const sessionData = { code: "WXYZ", status: "active", hostUid: "host_1" };
  const { db } = createEndSessionDb(sessionData);
  const sessionDoc = {
    id: "sess_1",
    data: () => sessionData,
    ref: {},
  };
  /** @type {Array<Record<string, unknown>>} */
  const captureCalls = [];
  const captureImpl = {
    capture: async (payload) => {
      captureCalls.push(payload);
    },
    shutdown: async () => {},
  };

  await autoEndIdleSession(db, sessionDoc, {
    posthogApiKey: "phk_test",
    captureImpl,
  });

  assert.equal(captureCalls.length, 1);
  assert.equal(captureCalls[0].distinctId, "host_1");
  assert.equal(captureCalls[0].event, "session_ended");
  assert.deepEqual(captureCalls[0].properties, { reason: "abandoned" });
  assert.equal(
    captureCalls[0].uuid,
    uuidFromSeed("session_ended:abandoned:sess_1"),
  );
});

test("autoEndIdleSession skips capture when session already ended", async () => {
  const sessionData = {
    code: "ABCD",
    status: "ended",
    endedAt: "2026-01-01T00:00:00.000Z",
    gameOutcome: "found",
    hostUid: "host_1",
  };
  const { db, updates } = createEndSessionDb(sessionData);
  const sessionDoc = {
    id: "sess_already",
    data: () => sessionData,
    ref: {},
  };
  const captureCalls = [];
  const captureImpl = {
    capture: async (payload) => {
      captureCalls.push(payload);
    },
    shutdown: async () => {},
  };

  await autoEndIdleSession(db, sessionDoc, {
    posthogApiKey: "phk_test",
    captureImpl,
  });

  assert.equal(updates.length, 0);
  assert.equal(captureCalls.length, 0);
});

test("autoEndIdleSession ends found-active session without abandoned capture", async () => {
  const sessionData = {
    code: "FOUND",
    status: "active",
    gameOutcome: "found",
    hostUid: "host_1",
  };
  const { db, updates } = createEndSessionDb(sessionData);
  const sessionDoc = {
    id: "sess_found",
    data: () => sessionData,
    ref: {},
  };
  const captureCalls = [];
  const captureImpl = {
    capture: async (payload) => {
      captureCalls.push(payload);
    },
    shutdown: async () => {},
  };

  await autoEndIdleSession(db, sessionDoc, {
    posthogApiKey: "phk_test",
    captureImpl,
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "ended");
  assert.equal(updates[0].gameOutcome, "found");
  assert.equal(captureCalls.length, 0);
});

test("autoEndIdleSession does not reject when capture throws", async () => {
  const sessionData = { code: "WXYZ", status: "active", hostUid: "host_1" };
  const { db } = createEndSessionDb(sessionData);
  const sessionDoc = {
    id: "sess_1",
    data: () => sessionData,
    ref: {},
  };
  const captureImpl = {
    capture: async () => {
      throw new Error("posthog down");
    },
    shutdown: async () => {},
  };

  await assert.doesNotReject(() =>
    autoEndIdleSession(db, sessionDoc, {
      posthogApiKey: "phk_test",
      captureImpl,
    }),
  );
});
