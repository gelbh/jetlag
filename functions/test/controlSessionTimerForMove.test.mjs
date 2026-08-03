import test from "node:test";
import assert from "node:assert/strict";
import {
  controlSessionTimerForMoveHandler,
  MOVE_TIMER_NOT_HIDER,
  MOVE_TIMER_SESSION_ENDED,
} from "../session/controlSessionTimerForMove.mjs";

function mockSessionDb({ sessionData, updates }) {
  const sessionRef = { id: "sess-1" };
  return {
    collection: (name) => {
      if (name === "sessions") {
        return { doc: () => sessionRef };
      }
      throw new Error(`unexpected ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({
          exists: true,
          data: () => sessionData,
        }),
        update: async (_ref, payload) => {
          updates.push(payload);
          for (const [key, value] of Object.entries(payload)) {
            if (value && typeof value === "object" && "isEqual" in value) {
              delete sessionData[key];
            } else {
              sessionData[key] = value;
            }
          }
        },
      };
      return fn(tx);
    },
  };
}

test("pause writes accumulated ms and clears runningSince for confirmed hider", async () => {
  const updates = [];
  const runningSince = "2026-08-03T12:00:00.000Z";
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "hider-1"],
    memberRoles: { host: "seeker", "hider-1": "hider" },
    timerAccumulatedMs: 60_000,
    timerRunningSince: runningSince,
  };
  const db = mockSessionDb({ sessionData, updates });

  const result = await controlSessionTimerForMoveHandler(
    db,
    "hider-1",
    "sess-1",
    "pause",
  );

  assert.equal(result.ok, true);
  assert.equal(result.action, "pause");
  assert.equal(result.noop, false);
  assert.equal(updates.length, 1);
  assert.equal(typeof updates[0].timerAccumulatedMs, "number");
  assert.ok(updates[0].timerAccumulatedMs >= 60_000);
  assert.ok(updates[0].timerRunningSince);
});

test("pause no-ops when timer already paused", async () => {
  const updates = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "hider-1"],
    memberRoles: { host: "seeker", "hider-1": "hider" },
    timerAccumulatedMs: 90_000,
    timerRunningSince: null,
  };
  const db = mockSessionDb({ sessionData, updates });

  const result = await controlSessionTimerForMoveHandler(
    db,
    "hider-1",
    "sess-1",
    "pause",
  );

  assert.deepEqual(result, { ok: true, action: "pause", noop: true });
  assert.equal(updates.length, 0);
});

test("resume starts timer for confirmed hider", async () => {
  const updates = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "hider-1"],
    memberRoles: { host: "seeker", "hider-1": "hider" },
    timerAccumulatedMs: 90_000,
    timerRunningSince: null,
  };
  const db = mockSessionDb({ sessionData, updates });

  const result = await controlSessionTimerForMoveHandler(
    db,
    "hider-1",
    "sess-1",
    "resume",
  );

  assert.equal(result.ok, true);
  assert.equal(result.action, "resume");
  assert.equal(result.noop, false);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].timerAccumulatedMs, 90_000);
  assert.equal(typeof updates[0].timerRunningSince, "string");
});

test("rejects non-hider callers", async () => {
  const updates = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "seeker-1"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    timerAccumulatedMs: 10_000,
    timerRunningSince: "2026-08-03T12:00:00.000Z",
  };
  const db = mockSessionDb({ sessionData, updates });

  await assert.rejects(
    () =>
      controlSessionTimerForMoveHandler(db, "seeker-1", "sess-1", "pause"),
    (error) => error instanceof Error && error.message === MOVE_TIMER_NOT_HIDER,
  );
  assert.equal(updates.length, 0);
});

test("rejects ended sessions", async () => {
  const updates = [];
  const sessionData = {
    status: "ended",
    endedAt: "2026-08-03T13:00:00.000Z",
    hostUid: "host",
    memberUids: ["host", "hider-1"],
    memberRoles: { host: "seeker", "hider-1": "hider" },
    timerAccumulatedMs: 10_000,
    timerRunningSince: "2026-08-03T12:00:00.000Z",
  };
  const db = mockSessionDb({ sessionData, updates });

  await assert.rejects(
    () =>
      controlSessionTimerForMoveHandler(db, "hider-1", "sess-1", "pause"),
    (error) =>
      error instanceof Error && error.message === MOVE_TIMER_SESSION_ENDED,
  );
});
