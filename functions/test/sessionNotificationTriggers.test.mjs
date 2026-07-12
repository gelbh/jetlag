import test from "node:test";
import assert from "node:assert/strict";
import {
  handlePendingQuestionWrite,
  handleSessionMessageWrite,
  handleSessionTimerWrite,
  loadSessionDevices,
} from "../session/sessionNotificationTriggers.mjs";

function firestoreChange(before, after) {
  return {
    before: before ? { data: () => before } : undefined,
    after: after ? { data: () => after } : undefined,
  };
}

function createMockDb(devices = {}) {
  return {
    collection(name) {
      assert.equal(name, "sessions");
      return {
        doc(sessionId) {
          return {
            collection(subName) {
              assert.equal(subName, "devices");
              return {
                async get() {
                  return {
                    docs: Object.entries(devices).map(([id, data]) => ({
                      id,
                      data: () => data,
                    })),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("loadSessionDevices returns registered device documents", async () => {
  const db = createMockDb({
    hider1: { token: "hider-token", role: "hider" },
  });

  const devices = await loadSessionDevices(db, "session-1");
  assert.deepEqual(devices, {
    hider1: { token: "hider-token", role: "hider" },
  });
});

test("handlePendingQuestionWrite ignores deletes", async () => {
  const db = createMockDb();

  await assert.doesNotReject(async () => {
    await handlePendingQuestionWrite(db, {
      params: { sessionId: "session-1", questionId: "pq-1" },
      data: firestoreChange({ status: "pending", toolType: "radar" }, undefined),
    });
  });
});

test("handlePendingQuestionWrite completes when no device tokens are registered", async () => {
  const db = createMockDb();

  await assert.doesNotReject(async () => {
    await handlePendingQuestionWrite(db, {
      params: { sessionId: "session-1", questionId: "pq-1" },
      data: firestoreChange(undefined, {
        createdByUid: "seeker-1",
        toolType: "radar",
        status: "pending",
      }),
    });
  });
});

test("handlePendingQuestionWrite handles answered and deadline transitions without tokens", async () => {
  const db = createMockDb();

  await handlePendingQuestionWrite(db, {
    params: { sessionId: "session-1", questionId: "pq-1" },
    data: firestoreChange(
      { status: "pending", toolType: "photo" },
      {
        status: "answered",
        answeredByUid: "hider-1",
        toolType: "photo",
      },
    ),
  });

  await handlePendingQuestionWrite(db, {
    params: { sessionId: "session-1", questionId: "pq-1" },
    data: firestoreChange(
      { status: "pending", toolType: "photo" },
      {
        status: "pending",
        toolType: "photo",
        deadlineExpiredAt: "2026-01-01T00:10:00.000Z",
      },
    ),
  });
});

test("handleSessionTimerWrite ignores unchanged timer state", async () => {
  const db = createMockDb();
  const timerState = {
    timerAccumulatedMs: 1000,
    timerRunningSince: null,
    hostUid: "seeker-1",
  };

  await handleSessionTimerWrite(db, {
    params: { sessionId: "session-1" },
    data: firestoreChange(timerState, timerState),
  });
});

test("handleSessionTimerWrite completes when timer changes but no tokens exist", async () => {
  const db = createMockDb();

  await assert.doesNotReject(async () => {
    await handleSessionTimerWrite(db, {
      params: { sessionId: "session-1" },
      data: firestoreChange(
        {
          timerAccumulatedMs: 0,
          timerRunningSince: null,
          hostUid: "seeker-1",
        },
        {
          timerAccumulatedMs: 0,
          timerRunningSince: "2026-01-01T00:00:00.000Z",
          hostUid: "seeker-1",
        },
      ),
    });
  });
});

test("handleSessionMessageWrite ignores non-social channels", async () => {
  const db = createMockDb();

  await handleSessionMessageWrite(db, {
    params: { sessionId: "session-1", messageId: "msg-1" },
    data: firestoreChange(undefined, {
      channel: "game",
      senderUid: "seeker-1",
      text: "System update",
    }),
  });
});

test("handleSessionMessageWrite completes for social messages without tokens", async () => {
  const db = createMockDb();

  await assert.doesNotReject(async () => {
    await handleSessionMessageWrite(db, {
      params: { sessionId: "session-1", messageId: "msg-1" },
      data: firestoreChange(undefined, {
        channel: "social",
        senderUid: "seeker-1",
        text: "Hello hiders",
      }),
    });
  });
});
