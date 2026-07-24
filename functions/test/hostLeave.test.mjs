import test from "node:test";
import assert from "node:assert/strict";
import {
  endSessionHandler,
  leaveHostSessionHandler,
  pickHostPromotee,
  LEAVE_NOT_HOST,
  LEAVE_ALREADY_ENDED,
} from "../session/hostLeave.mjs";

test("pickHostPromotee prefers seeker over hider", () => {
  assert.equal(
    pickHostPromotee(
      ["host", "h1", "s1"],
      { host: "seeker", h1: "hider", s1: "seeker" },
      "host",
    ),
    "s1",
  );
});

test("pickHostPromotee returns null when alone", () => {
  assert.equal(pickHostPromotee(["host"], { host: "seeker" }, "host"), null);
});

test("pickHostPromotee lexicographic tie-break among seekers", () => {
  assert.equal(
    pickHostPromotee(
      ["host", "b", "a"],
      { host: "seeker", a: "seeker", b: "seeker" },
      "host",
    ),
    "a",
  );
});

function mockSessionDb({ sessionData, sessionExists = true, updates, ended }) {
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
      if (name === "sessionCodes") {
        return {
          doc: (id) => ({ name, id }),
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
        delete: async (ref) => {
          ended.deleted.push(ref);
        },
      };
      await fn(tx);
    },
    _sessionRef: sessionRef,
  };
}

test("leaveHostSessionHandler promotes another seeker", async () => {
  const updates = [];
  const ended = { deleted: [] };
  const sessionData = {
    hostUid: "host",
    status: "active",
    memberUids: ["host", "s1"],
    memberRoles: { host: "seeker", s1: "seeker" },
    code: "ABCD",
  };
  const db = mockSessionDb({ sessionData, updates, ended });

  const result = await leaveHostSessionHandler(db, "host", "sess-1");
  assert.deepEqual(result, { action: "promoted", newHostUid: "s1" });
  assert.deepEqual(updates, [{ hostUid: "s1" }]);
  assert.equal(ended.deleted.length, 0);
});

test("leaveHostSessionHandler ends when host is alone", async () => {
  const updates = [];
  const ended = { deleted: [] };
  let liveData = {
    hostUid: "host",
    status: "active",
    memberUids: ["host"],
    memberRoles: { host: "seeker" },
    code: "ABCD",
  };
  const sessionRef = {
    id: "sess-1",
    get: async () => ({
      exists: true,
      data: () => liveData,
      ref: sessionRef,
    }),
  };
  const db = {
    collection: (name) => {
      if (name === "sessions") {
        return { doc: () => sessionRef };
      }
      if (name === "sessionCodes") {
        return { doc: (id) => ({ name, id }) };
      }
      throw new Error(`unexpected ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({
          exists: true,
          data: () => liveData,
        }),
        update: async (_ref, payload) => {
          updates.push(payload);
          liveData = { ...liveData, ...payload, code: undefined };
          if (payload.code && typeof payload.code === "object") {
            delete liveData.code;
          }
          if (payload.status === "ended") {
            liveData.status = "ended";
            liveData.endedAt = payload.endedAt;
            liveData.gameOutcome = payload.gameOutcome;
          }
        },
        delete: async (ref) => {
          ended.deleted.push(ref);
        },
      };
      await fn(tx);
    },
  };

  const result = await leaveHostSessionHandler(db, "host", "sess-1");
  assert.deepEqual(result, { action: "ended" });
  assert.equal(updates.some((u) => u.status === "ended"), true);
  assert.equal(updates.some((u) => u.gameOutcome === "ended_early"), true);
  assert.deepEqual(ended.deleted, [{ name: "sessionCodes", id: "ABCD" }]);
});

test("leaveHostSessionHandler rejects non-host", async () => {
  const updates = [];
  const ended = { deleted: [] };
  const db = mockSessionDb({
    sessionData: {
      hostUid: "host",
      status: "active",
      memberUids: ["host", "other"],
      memberRoles: { host: "seeker", other: "seeker" },
    },
    updates,
    ended,
  });

  await assert.rejects(
    () => leaveHostSessionHandler(db, "other", "sess-1"),
    (error) => error instanceof Error && error.message === LEAVE_NOT_HOST,
  );
});

test("endSessionHandler ends for host", async () => {
  const updates = [];
  const ended = { deleted: [] };
  let liveData = {
    hostUid: "host",
    status: "active",
    memberUids: ["host", "s1"],
    memberRoles: { host: "seeker", s1: "hider" },
    code: "ZZZZ",
  };
  const sessionRef = {
    id: "sess-1",
    get: async () => ({
      exists: true,
      data: () => liveData,
      ref: sessionRef,
    }),
  };
  const db = {
    collection: (name) => {
      if (name === "sessions") {
        return { doc: () => sessionRef };
      }
      if (name === "sessionCodes") {
        return { doc: (id) => ({ name, id }) };
      }
      throw new Error(`unexpected ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({
          exists: true,
          data: () => liveData,
        }),
        update: async (_ref, payload) => {
          updates.push(payload);
        },
        delete: async (ref) => {
          ended.deleted.push(ref);
        },
      };
      await fn(tx);
    },
  };

  const result = await endSessionHandler(db, "host", "sess-1");
  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0].status, "ended");
  assert.equal(updates[0].gameOutcome, "ended_early");
  assert.deepEqual(ended.deleted, [{ name: "sessionCodes", id: "ZZZZ" }]);
});

test("endSessionHandler rejects already ended", async () => {
  const updates = [];
  const ended = { deleted: [] };
  const db = mockSessionDb({
    sessionData: {
      hostUid: "host",
      status: "ended",
      endedAt: "2026-01-01T00:00:00.000Z",
    },
    updates,
    ended,
  });

  await assert.rejects(
    () => endSessionHandler(db, "host", "sess-1"),
    (error) => error instanceof Error && error.message === LEAVE_ALREADY_ENDED,
  );
});
