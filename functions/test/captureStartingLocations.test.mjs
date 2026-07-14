import test from "node:test";
import assert from "node:assert/strict";
import {
  captureStartingLocationsForSession,
  handleCaptureStartingLocationsWrite,
  isFirstTimerStartTransition,
} from "../session/captureStartingLocations.mjs";

function firestoreChange(before, after) {
  return {
    before: before ? { data: () => before } : undefined,
    after: after ? { data: () => after } : undefined,
  };
}

function createCaptureMockDb({ session = {}, playerLocations = [] } = {}) {
  const startingLocations = new Map();

  return {
    startingLocations,
    collection(name) {
      assert.equal(name, "sessions");
      return {
        doc(sessionId) {
          return {
            async get() {
              return {
                exists: true,
                data: () => session,
              };
            },
            collection(subName) {
              if (subName === "playerLocations") {
                return {
                  async get() {
                    return {
                      empty: playerLocations.length === 0,
                      docs: playerLocations.map(({ id, data }) => ({
                        id,
                        data: () => data,
                      })),
                    };
                  },
                };
              }

              if (subName === "startingLocations") {
                return {
                  doc(uid) {
                    return {
                      set(payload) {
                        startingLocations.set(uid, payload);
                      },
                    };
                  },
                };
              }

              throw new Error(`Unexpected subcollection: ${subName}`);
            },
          };
        },
      };
    },
    batch() {
      const writes = [];
      return {
        set(ref, payload) {
          writes.push({ ref, payload });
        },
        async commit() {
          for (const write of writes) {
            await write.ref.set(write.payload);
          }
        },
      };
    },
  };
}

test("isFirstTimerStartTransition detects first timer start only", () => {
  assert.equal(
    isFirstTimerStartTransition(
      { timerRunningSince: null },
      { timerRunningSince: "2026-01-01T00:00:00.000Z" },
    ),
    true,
  );
  assert.equal(
    isFirstTimerStartTransition(
      { timerRunningSince: "2026-01-01T00:00:00.000Z" },
      { timerRunningSince: "2026-01-01T00:01:00.000Z" },
    ),
    false,
  );
  assert.equal(
    isFirstTimerStartTransition(undefined, { timerRunningSince: "2026-01-01T00:00:00.000Z" }),
    true,
  );
});

test("captureStartingLocationsForSession writes player locations to startingLocations", async () => {
  const db = createCaptureMockDb({
    session: {
      memberRoles: {
        "seeker-1": "seeker",
        "hider-1": "hider",
      },
    },
    playerLocations: [
      {
        id: "seeker-1",
        data: {
          lat: 51.5,
          lng: -0.1,
          accuracyMeters: 12,
          role: "seeker",
        },
      },
      {
        id: "hider-1",
        data: {
          lat: 51.51,
          lng: -0.11,
          role: "hider",
        },
      },
    ],
  });

  const result = await captureStartingLocationsForSession(
    db,
    "session-1",
    "2026-01-01T00:00:00.000Z",
  );

  assert.equal(result.captured, 2);
  assert.deepEqual(db.startingLocations.get("seeker-1"), {
    uid: "seeker-1",
    sessionId: "session-1",
    lat: 51.5,
    lng: -0.1,
    accuracyMeters: 12,
    role: "seeker",
    capturedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.deepEqual(db.startingLocations.get("hider-1"), {
    uid: "hider-1",
    sessionId: "session-1",
    lat: 51.51,
    lng: -0.11,
    role: "hider",
    capturedAt: "2026-01-01T00:00:00.000Z",
  });
});

test("handleCaptureStartingLocationsWrite ignores non-start timer updates", async () => {
  const db = createCaptureMockDb();

  await handleCaptureStartingLocationsWrite(db, {
    params: { sessionId: "session-1" },
    data: firestoreChange(
      {
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        timerAccumulatedMs: 1000,
      },
      {
        timerRunningSince: "2026-01-01T00:01:00.000Z",
        timerAccumulatedMs: 1000,
      },
    ),
  });

  assert.equal(db.startingLocations.size, 0);
});

test("handleCaptureStartingLocationsWrite captures on first timer start", async () => {
  const db = createCaptureMockDb({
    session: { memberRoles: { "seeker-1": "seeker" } },
    playerLocations: [
      {
        id: "seeker-1",
        data: { lat: 40.7, lng: -74.0, role: "seeker" },
      },
    ],
  });

  await handleCaptureStartingLocationsWrite(db, {
    params: { sessionId: "session-1" },
    data: firestoreChange(
      { timerRunningSince: null, timerAccumulatedMs: 0 },
      {
        timerRunningSince: "2026-01-01T00:00:00.000Z",
        timerAccumulatedMs: 0,
      },
    ),
  });

  assert.equal(db.startingLocations.size, 1);
});
