import test from "node:test";
import assert from "node:assert/strict";
import {
  approveHostConfirmHandler,
  denyHostConfirmHandler,
  hashToolArgs,
  HOST_CONFIRM_EXPIRED,
  HOST_CONFIRM_FORBIDDEN,
  HOST_CONFIRM_NOT_PENDING,
  HOST_CONFIRM_TTL_MS,
  isHostConfirmExpired,
  requestHostConfirm,
} from "../incident/hostConfirm.mjs";

function applyUpdate(target, data) {
  for (const [key, value] of Object.entries(data)) {
    target[key] = value;
  }
}

function mockHostConfirmDb({
  incident = {
    status: "open",
    reporterUid: "reporter-1",
    sessionId: "sess-1",
  },
  session = {
    status: "active",
    hostUid: "host-1",
    memberUids: ["host-1", "reporter-1"],
  },
} = {}) {
  const incidents = new Map([["inc-1", { ...incident }]]);
  const sessions = new Map([["sess-1", { ...session }]]);
  const hostConfirms = new Map();
  /** Serialize transactions so concurrent claims see committed state. */
  let txChain = Promise.resolve();

  function confirmRef(incidentId, confirmId) {
    const key = `${incidentId}/${confirmId}`;
    return {
      id: confirmId,
      path: `incidents/${incidentId}/hostConfirms/${confirmId}`,
      get: async () => ({
        exists: hostConfirms.has(key),
        data: () => hostConfirms.get(key),
      }),
      set: async (data) => {
        hostConfirms.set(key, { ...(hostConfirms.get(key) ?? {}), ...data });
      },
      update: async (data) => {
        const current = hostConfirms.get(key) ?? {};
        applyUpdate(current, data);
        hostConfirms.set(key, current);
      },
    };
  }

  return {
    _hostConfirms: hostConfirms,
    _sessions: sessions,
    collection: (name) => {
      if (name === "incidents") {
        return {
          doc: (id) => ({
            id,
            get: async () => ({
              exists: incidents.has(id),
              data: () => incidents.get(id),
            }),
            collection: (sub) => {
              if (sub === "hostConfirms") {
                return {
                  doc: (confirmId) => confirmRef(id, confirmId),
                };
              }
              throw new Error(`unexpected subcollection ${sub}`);
            },
          }),
        };
      }
      if (name === "sessions") {
        return {
          doc: (id) => ({
            id,
            get: async () => ({
              exists: sessions.has(id),
              data: () => sessions.get(id),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(callback) {
      const run = async () => {
        const pendingUpdates = [];
        const transaction = {
          async get(ref) {
            return ref.get();
          },
          update(ref, data) {
            pendingUpdates.push({ ref, data });
          },
        };
        const result = await callback(transaction);
        for (const { ref, data } of pendingUpdates) {
          await ref.update(data);
        }
        return result;
      };
      const next = txChain.then(run, run);
      txChain = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };
}

test("hashToolArgs is stable for the same args", () => {
  assert.equal(hashToolArgs({ note: "a" }), hashToolArgs({ note: "a" }));
  assert.notEqual(hashToolArgs({ note: "a" }), hashToolArgs({ note: "b" }));
});

test("isHostConfirmExpired respects TTL boundary", () => {
  const now = () => new Date("2026-07-25T12:00:00.000Z");
  assert.equal(
    isHostConfirmExpired("2026-07-25T12:00:00.000Z", now),
    true,
  );
  assert.equal(
    isHostConfirmExpired("2026-07-25T12:00:01.000Z", now),
    false,
  );
});

test("requestHostConfirm creates pending doc and notifies host", async () => {
  const db = mockHostConfirmDb();
  const notifications = [];
  const fixedNow = new Date("2026-07-25T12:00:00.000Z");

  const result = await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "reset_board",
      args: { note: "clear stuck board" },
      requestedByUid: "agent-1",
    },
    {
      now: () => fixedNow,
      generateId: () => "confirm-1",
      ttlMs: HOST_CONFIRM_TTL_MS,
      notify: async (payload) => {
        notifications.push(payload);
      },
    },
  );

  assert.equal(result.confirmId, "confirm-1");
  assert.equal(result.hostUid, "host-1");
  assert.equal(result.status, "pending");
  assert.equal(result.expiresAt, "2026-07-25T12:05:00.000Z");

  const stored = db._hostConfirms.get("inc-1/confirm-1");
  assert.equal(stored.status, "pending");
  assert.equal(stored.tool, "reset_board");
  assert.equal(stored.argsHash, hashToolArgs({ note: "clear stuck board" }));
  assert.equal(stored.hostUid, "host-1");

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].eventType, "incident_host_confirm");
  assert.equal(notifications[0].targetUid, "host-1");
  assert.equal(notifications[0].context.confirmId, "confirm-1");
});

test("approveHostConfirmHandler rejects non-host", async () => {
  const db = mockHostConfirmDb();
  await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "end_session",
      args: {},
      requestedByUid: "agent-1",
    },
    {
      now: () => new Date("2026-07-25T12:00:00.000Z"),
      generateId: () => "confirm-1",
      notify: async () => {},
    },
  );

  await assert.rejects(
    () =>
      approveHostConfirmHandler(
        db,
        {
          incidentId: "inc-1",
          confirmId: "confirm-1",
          uid: "reporter-1",
        },
        {
          now: () => new Date("2026-07-25T12:01:00.000Z"),
          execute: async () => {
            throw new Error("should not execute");
          },
        },
      ),
    (error) => error.message === HOST_CONFIRM_FORBIDDEN,
  );
});

test("approveHostConfirmHandler rejects expired pending confirms", async () => {
  const db = mockHostConfirmDb();
  await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "reset_board",
      args: {},
      requestedByUid: "agent-1",
    },
    {
      now: () => new Date("2026-07-25T12:00:00.000Z"),
      generateId: () => "confirm-1",
      ttlMs: 60_000,
      notify: async () => {},
    },
  );

  await assert.rejects(
    () =>
      approveHostConfirmHandler(
        db,
        {
          incidentId: "inc-1",
          confirmId: "confirm-1",
          uid: "host-1",
        },
        {
          now: () => new Date("2026-07-25T12:02:00.000Z"),
          execute: async () => ({ status: "ok", auditId: "a1" }),
        },
      ),
    (error) => error.message === HOST_CONFIRM_EXPIRED,
  );

  assert.equal(db._hostConfirms.get("inc-1/confirm-1").status, "expired");
});

test("approveHostConfirmHandler host executes once then rejects reuse", async () => {
  const db = mockHostConfirmDb();
  await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "clear_pending_questions",
      args: {},
      requestedByUid: "agent-1",
    },
    {
      now: () => new Date("2026-07-25T12:00:00.000Z"),
      generateId: () => "confirm-1",
      notify: async () => {},
    },
  );

  const executed = [];
  const first = await approveHostConfirmHandler(
    db,
    {
      incidentId: "inc-1",
      confirmId: "confirm-1",
      uid: "host-1",
    },
    {
      now: () => new Date("2026-07-25T12:01:00.000Z"),
      execute: async (_db, input) => {
        executed.push(input);
        return { status: "ok", auditId: "audit-1", tool: input.tool };
      },
    },
  );

  assert.equal(first.status, "approved");
  assert.equal(executed.length, 1);
  assert.equal(executed[0].hostConfirmed, true);
  assert.equal(executed[0].tool, "clear_pending_questions");
  assert.equal(executed[0].actorUid, "host-1");

  const stored = db._hostConfirms.get("inc-1/confirm-1");
  assert.equal(stored.status, "approved");
  assert.equal(stored.executeAuditId, "audit-1");

  await assert.rejects(
    () =>
      approveHostConfirmHandler(
        db,
        {
          incidentId: "inc-1",
          confirmId: "confirm-1",
          uid: "host-1",
        },
        {
          now: () => new Date("2026-07-25T12:01:30.000Z"),
          execute: async () => {
            executed.push("again");
            return { status: "ok", auditId: "audit-2" };
          },
        },
      ),
    (error) => error.message === HOST_CONFIRM_NOT_PENDING,
  );
  assert.equal(executed.length, 1);
});

test("approveHostConfirmHandler concurrent claims execute once", async () => {
  const db = mockHostConfirmDb();
  await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "reset_board",
      args: {},
      requestedByUid: "agent-1",
    },
    {
      now: () => new Date("2026-07-25T12:00:00.000Z"),
      generateId: () => "confirm-1",
      notify: async () => {},
    },
  );

  const executed = [];
  const approve = () =>
    approveHostConfirmHandler(
      db,
      {
        incidentId: "inc-1",
        confirmId: "confirm-1",
        uid: "host-1",
      },
      {
        now: () => new Date("2026-07-25T12:01:00.000Z"),
        execute: async (_db, input) => {
          executed.push(input.tool);
          return { status: "ok", auditId: `audit-${executed.length}` };
        },
      },
    );

  const results = await Promise.allSettled([approve(), approve()]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.message, HOST_CONFIRM_NOT_PENDING);
  assert.equal(executed.length, 1);
  assert.equal(db._hostConfirms.get("inc-1/confirm-1").status, "approved");
});

test("denyHostConfirmHandler only host may deny pending", async () => {
  const db = mockHostConfirmDb();
  await requestHostConfirm(
    db,
    {
      incidentId: "inc-1",
      sessionId: "sess-1",
      tool: "end_session",
      args: {},
      requestedByUid: "agent-1",
    },
    {
      now: () => new Date("2026-07-25T12:00:00.000Z"),
      generateId: () => "confirm-1",
      notify: async () => {},
    },
  );

  await assert.rejects(
    () =>
      denyHostConfirmHandler(
        db,
        {
          incidentId: "inc-1",
          confirmId: "confirm-1",
          uid: "stranger-1",
        },
        { now: () => new Date("2026-07-25T12:01:00.000Z") },
      ),
    (error) => error.message === HOST_CONFIRM_FORBIDDEN,
  );

  const denied = await denyHostConfirmHandler(
    db,
    {
      incidentId: "inc-1",
      confirmId: "confirm-1",
      uid: "host-1",
    },
    { now: () => new Date("2026-07-25T12:01:00.000Z") },
  );
  assert.equal(denied.status, "denied");
  assert.equal(db._hostConfirms.get("inc-1/confirm-1").status, "denied");
});
