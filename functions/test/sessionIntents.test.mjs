import assert from "node:assert/strict";
import test from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import { INTENT_MAX_AGE_MS, processSessionIntentHandler } from "../session/sessionIntents.mjs";

const T0 = Date.parse("2026-10-01T12:00:00.000Z");

function ts(ms) {
  return { toMillis: () => ms };
}

function isSentinel(value, sentinel) {
  return Boolean(value && typeof value.isEqual === "function" && value.isEqual(sentinel));
}

/** Minimal in-memory Firestore: sessions/{id} + sessions/{id}/intents/{id}, one transaction at a time. */
function createIntentDb({ session, intents = {} }) {
  const state = {
    session: session ? { ...session } : null,
    intents: new Map(Object.entries(intents).map(([id, data]) => [id, { ...data }])),
    sessionUpdates: [],
  };

  const intentRef = (id) => ({ kind: "intent", id });
  const sessionRef = { kind: "session" };

  function applyUpdate(target, payload) {
    for (const [key, value] of Object.entries(payload)) {
      if (isSentinel(value, FieldValue.delete())) {
        delete target[key];
      } else if (isSentinel(value, FieldValue.serverTimestamp())) {
        target[key] = ts(Date.now());
      } else {
        target[key] = value;
      }
    }
  }

  function makeQuery(filters = [], orderField = null, max = Infinity) {
    return {
      kind: "query",
      where: (field, op, value) => makeQuery([...filters, { field, op, value }], orderField, max),
      orderBy: (field) => makeQuery(filters, field, max),
      limit: (n) => makeQuery(filters, orderField, n),
      run() {
        let rows = [...state.intents.entries()].filter(([, data]) =>
          filters.every(({ field, op, value }) => {
            assert.equal(op, "<=");
            const left = data[field]?.toMillis?.();
            return Number.isFinite(left) && left <= value.toMillis();
          }),
        );
        if (orderField) {
          rows.sort(([, a], [, b]) => a[orderField].toMillis() - b[orderField].toMillis());
        }
        rows = rows.slice(0, max);
        return {
          docs: rows.map(([id, data]) => ({ id, ref: intentRef(id), data: () => ({ ...data }) })),
        };
      },
    };
  }

  const intentsCollection = {
    doc: (id) => intentRef(id),
    ...makeQuery(),
  };

  const db = {
    state,
    collection(name) {
      assert.equal(name, "sessions");
      return {
        doc: () => ({ ...sessionRef, collection: () => intentsCollection }),
      };
    },
    async runTransaction(fn) {
      const writes = [];
      const tx = {
        async get(ref) {
          if (ref.kind === "query") {
            return ref.run();
          }
          if (ref.kind === "session") {
            return { exists: state.session !== null, data: () => ({ ...state.session }) };
          }
          const data = state.intents.get(ref.id);
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
        update(ref, payload) {
          writes.push([ref, payload]);
        },
      };
      const result = await fn(tx);
      for (const [ref, payload] of writes) {
        if (ref.kind === "session") {
          state.sessionUpdates.push(payload);
          applyUpdate(state.session, payload);
        } else {
          applyUpdate(state.intents.get(ref.id), payload);
        }
      }
      return result;
    },
  };
  return db;
}

function runningSession(overrides = {}) {
  return {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "hider-1", "seeker-1"],
    memberRoles: { host: "seeker", "hider-1": "hider", "seeker-1": "seeker" },
    timerAccumulatedMs: 10_000,
    timerRunningSince: new Date(T0).toISOString(),
    ...overrides,
  };
}

function moveIntent(overrides = {}) {
  return {
    type: "moveTimer",
    action: "pause",
    uid: "hider-1",
    requestedAtMs: T0 + 60_000,
    createdAt: ts(T0 + 600_000),
    ...overrides,
  };
}

test("pause applies at play time, not receipt time", async () => {
  const db = createIntentDb({ session: runningSession(), intents: { i1: moveIntent() } });

  const result = await processSessionIntentHandler(db, "s1", "i1", T0 + 600_000);

  assert.equal(result.status, "applied");
  assert.equal(db.state.session.timerAccumulatedMs, 10_000 + 60_000);
  assert.equal(db.state.session.timerRunningSince, undefined);
  assert.equal(db.state.intents.get("i1").status, "applied");
  assert.ok(db.state.intents.get("i1").processedAt);
});

test("double delivery is a noop the second time", async () => {
  const db = createIntentDb({ session: runningSession(), intents: { i1: moveIntent() } });

  await processSessionIntentHandler(db, "s1", "i1", T0 + 600_000);
  const second = await processSessionIntentHandler(db, "s1", "i1", T0 + 700_000);

  assert.deepEqual(second, { status: "noop", reason: "already-processed" });
  assert.equal(db.state.session.timerAccumulatedMs, 70_000);
  assert.equal(db.state.sessionUpdates.length, 1);
});

test("requestedAtMs before runningSince clamps to runningSince", async () => {
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ requestedAtMs: T0 - 5_000_000, createdAt: ts(T0 + 1_000) }) },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", T0 + 1_000);

  assert.equal(result.status, "applied");
  assert.equal(db.state.session.timerAccumulatedMs, 10_000);
});

test("requestedAtMs in the future clamps to now", async () => {
  const now = T0 + 120_000;
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ requestedAtMs: now + 9_999_999, createdAt: ts(now) }) },
  });

  await processSessionIntentHandler(db, "s1", "i1", now);

  assert.equal(db.state.session.timerAccumulatedMs, 10_000 + 120_000);
});

test("pause cannot rewind more than the intent max age", async () => {
  const now = T0 + 3 * 60 * 60_000;
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ requestedAtMs: T0 + 1_000, createdAt: ts(now) }) },
  });

  await processSessionIntentHandler(db, "s1", "i1", now);

  assert.equal(db.state.session.timerAccumulatedMs, 10_000 + (now - INTENT_MAX_AGE_MS - T0));
});

test("intent older than the max age is marked stale and leaves the timer alone", async () => {
  const now = T0 + INTENT_MAX_AGE_MS + 60_000;
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ createdAt: ts(T0) }) },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", now);

  assert.equal(result.status, "stale");
  assert.equal(db.state.intents.get("i1").status, "stale");
  assert.equal(db.state.sessionUpdates.length, 0);
});

test("non-hider uid is rejected", async () => {
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ uid: "seeker-1" }) },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", T0 + 600_000);

  assert.deepEqual(result, { status: "rejected", reason: "not-hider" });
  assert.equal(db.state.sessionUpdates.length, 0);
});

test("ended session is rejected", async () => {
  const db = createIntentDb({
    session: runningSession({ status: "ended", endedAt: new Date(T0).toISOString() }),
    intents: { i1: moveIntent() },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", T0 + 600_000);

  assert.deepEqual(result, { status: "rejected", reason: "session-ended" });
  assert.equal(db.state.sessionUpdates.length, 0);
});

test("missing intent doc is a noop", async () => {
  const db = createIntentDb({ session: runningSession() });

  const result = await processSessionIntentHandler(db, "s1", "nope", T0);

  assert.deepEqual(result, { status: "noop", reason: "missing" });
});

test("resume starts the timer at server now", async () => {
  const now = T0 + 900_000;
  const db = createIntentDb({
    session: runningSession({ timerRunningSince: undefined }),
    intents: { i1: moveIntent({ action: "resume", requestedAtMs: T0, createdAt: ts(now) }) },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", now);

  assert.equal(result.status, "applied");
  assert.equal(db.state.session.timerAccumulatedMs, 10_000);
  assert.equal(db.state.session.timerRunningSince, new Date(now).toISOString());
});

test("resume delivered before its queued pause drains the pause first", async () => {
  const now = T0 + 600_000;
  const db = createIntentDb({
    session: runningSession(),
    intents: {
      pause: moveIntent({ requestedAtMs: T0 + 60_000, createdAt: ts(now - 2) }),
      resume: moveIntent({ action: "resume", requestedAtMs: T0 + 300_000, createdAt: ts(now - 1) }),
    },
  });

  const resumeResult = await processSessionIntentHandler(db, "s1", "resume", now);
  const pauseResult = await processSessionIntentHandler(db, "s1", "pause", now + 1);

  assert.equal(resumeResult.status, "applied");
  assert.deepEqual(pauseResult, { status: "noop", reason: "already-processed" });
  assert.equal(db.state.intents.get("pause").status, "applied");
  assert.equal(db.state.session.timerAccumulatedMs, 10_000 + 60_000);
  assert.equal(db.state.session.timerRunningSince, new Date(now).toISOString());
});

test("unknown action is rejected", async () => {
  const db = createIntentDb({
    session: runningSession(),
    intents: { i1: moveIntent({ action: "rewind" }) },
  });

  const result = await processSessionIntentHandler(db, "s1", "i1", T0 + 600_000);

  assert.deepEqual(result, { status: "rejected", reason: "bad-action" });
});
