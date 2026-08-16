import test from "node:test";
import assert from "node:assert/strict";
import { FieldValue } from "firebase-admin/firestore";
import {
  REMATCH_NOT_MEMBER,
  REMATCH_NOT_OVER,
  REMATCH_SESSION_NOT_FOUND,
  resetSessionForRematchHandler,
} from "../session/resetSessionForRematch.mjs";

function mockRematchDb({
  sessionData,
  sessionExists = true,
  anchorsExists = true,
  updates,
  deletes,
  sets,
}) {
  const sessionRef = { id: "sess-1", path: "sessions/sess-1" };
  const gameResultRef = { id: "result-1", path: "sessions/sess-1/gameResult/result-1" };
  const archiveRef = { id: "0", path: "sessions/sess-1/rounds/0" };
  const anchorsRef = { id: "anchors", path: "sessions/sess-1/endGameTruth/anchors" };
  let wrote = false;

  const emptyExtrasCollection = {
    where() {
      return {
        async get() {
          return { empty: true, docs: [] };
        },
      };
    },
    async get() {
      return { empty: true, docs: [] };
    },
    doc(id) {
      const ref = { id, path: `sessions/sess-1/extras/${id}` };
      return {
        ...ref,
        async get() {
          return { exists: false, data: () => ({}) };
        },
        collection() {
          return emptyExtrasCollection;
        },
      };
    },
  };

  return {
    collection: (name) => {
      if (name === "sessions") {
        return {
          doc: () => ({
            ...sessionRef,
            async get() {
              return {
                exists: sessionExists,
                data: () => sessionData,
              };
            },
            collection: (sub) => {
              if (sub === "gameResult") {
                return { doc: () => gameResultRef };
              }
              if (sub === "rounds") {
                return { doc: () => archiveRef };
              }
              if (sub === "endGameTruth") {
                return {
                  doc: () => ({
                    ...anchorsRef,
                    async get() {
                      return {
                        exists: anchorsExists,
                        data: () =>
                          anchorsExists
                            ? { anchors: { host: { lat: 1, lng: 2 } } }
                            : {},
                      };
                    },
                  }),
                };
              }
              // Extras reset after TX: empty no-op so handler still succeeds.
              if (
                sub === "annotations" ||
                sub === "pendingQuestions" ||
                sub === "playerLocations" ||
                sub === "hidingZones" ||
                sub === "timeTraps" ||
                sub === "startingLocations" ||
                sub === "boardEconomy" ||
                sub === "playerTrailPoints"
              ) {
                return emptyExtrasCollection;
              }
              throw new Error(`unexpected sub ${sub}`);
            },
          }),
        };
      }
      throw new Error(`unexpected ${name}`);
    },
    batch() {
      const ops = [];
      return {
        update() {},
        delete() {},
        async commit() {
          void ops;
        },
      };
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (wrote) {
            throw new Error("Firestore transactions require all reads before writes");
          }
          if (ref === gameResultRef) {
            return {
              exists: Boolean(sessionData.gameResultId),
              data: () => ({
                outcome: "found",
                endedAt: "2026-08-05T00:00:00.000Z",
              }),
            };
          }
          if (ref === anchorsRef || ref?.path === anchorsRef.path) {
            return {
              exists: anchorsExists,
              data: () => (anchorsExists ? { anchors: { host: { lat: 1, lng: 2 } } } : {}),
            };
          }
          return {
            exists: sessionExists,
            data: () => sessionData,
          };
        },
        update: async (_ref, payload) => {
          wrote = true;
          updates.push(payload);
        },
        set: async (_ref, payload) => {
          wrote = true;
          sets.push(payload);
        },
        delete: async (ref) => {
          wrote = true;
          deletes.push(ref.path ?? ref.id);
        },
      };
      await fn(tx);
    },
  };
}

test("member rematch swaps roles, roleGates leaders, clears end-game truth anchors", async () => {
  const updates = [];
  const deletes = [];
  const sets = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "guest"],
    memberRoles: { host: "seeker", guest: "hider" },
    roleGates: { version: 1, leaders: { seeker: "host", hider: "guest" } },
    roundNumber: 0,
    gameResultId: "result-1",
    gameOutcome: "found",
    endGameTruthAnchors: { host: { lat: 1, lng: 2 } },
    timerAccumulatedMs: 12000,
    timerRunningSince: "2026-08-05T00:00:00.000Z",
    endGameStartedAt: "2026-08-05T00:01:00.000Z",
    endGameStartedByUid: "host",
    foundConfirmedAt: "2026-08-05T00:02:00.000Z",
    foundConfirmedByUid: "guest",
  };
  const db = mockRematchDb({ sessionData, updates, deletes, sets });

  await resetSessionForRematchHandler(db, "guest", "sess-1");

  assert.equal(updates.length, 1);
  const patch = updates[0];
  assert.deepEqual(patch.memberRoles, { host: "hider", guest: "seeker" });
  assert.deepEqual(patch.roleGates, {
    version: 1,
    leaders: { seeker: "guest", hider: "host" },
  });
  assert.equal(patch.roundNumber, 1);
  assert.equal(typeof patch.sessionResetAt, "string");
  assert.equal(patch.timerAccumulatedMs, 0);
  assert.equal(patch.endGameTruthAnchors, FieldValue.delete());
  assert.equal(patch.gameOutcome, FieldValue.delete());
  assert.equal(patch.gameResultId, FieldValue.delete());
  assert.ok(deletes.includes("sessions/sess-1/endGameTruth/anchors"));
  assert.equal(sets.length, 1);
});

test("mid-round rematch is denied", async () => {
  const updates = [];
  const db = mockRematchDb({
    sessionData: {
      status: "active",
      hostUid: "host",
      memberUids: ["host", "guest"],
      memberRoles: { host: "seeker", guest: "hider" },
      timerAccumulatedMs: 12_000,
      timerRunningSince: "2026-08-15T12:00:00.000Z",
    },
    updates,
    deletes: [],
    sets: [],
  });
  await assert.rejects(
    () => resetSessionForRematchHandler(db, "host", "sess-1"),
    (error) => error instanceof Error && error.message === REMATCH_NOT_OVER,
  );
  assert.equal(updates.length, 0);
});

test("second rematch while idle does not swap roles again", async () => {
  const updates = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "guest"],
    memberRoles: { host: "hider", guest: "seeker" },
    roleGates: { version: 1, leaders: { seeker: "guest", hider: "host" } },
    roundNumber: 1,
    sessionResetAt: "2026-08-15T12:01:00.000Z",
    timerAccumulatedMs: 0,
  };
  const db = mockRematchDb({
    sessionData,
    updates,
    deletes: [],
    sets: [],
    anchorsExists: false,
  });
  // Extras runs after TX (including idle) but must not fail the player when
  // the rematch mock rejects unexpected subcollections.
  await resetSessionForRematchHandler(db, "guest", "sess-1");
  assert.equal(updates.length, 0);
});

test("stale memberRoles without memberUids cannot rematch", async () => {
  const updates = [];
  const deletes = [];
  const sets = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host"],
    memberRoles: { host: "seeker", guest: "hider" },
    roleGates: { version: 1, leaders: { seeker: "host", hider: "guest" } },
    roundNumber: 2,
  };
  const db = mockRematchDb({ sessionData, updates, deletes, sets });

  await assert.rejects(
    () => resetSessionForRematchHandler(db, "guest", "sess-1"),
    (error) => error instanceof Error && error.message === REMATCH_NOT_MEMBER,
  );
  assert.equal(updates.length, 0);
});

test("non-member rematch is denied", async () => {
  const updates = [];
  const deletes = [];
  const sets = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host"],
    memberRoles: { host: "seeker" },
  };
  const db = mockRematchDb({ sessionData, updates, deletes, sets });

  await assert.rejects(
    () => resetSessionForRematchHandler(db, "stranger", "sess-1"),
    (error) => error instanceof Error && error.message === REMATCH_NOT_MEMBER,
  );
  assert.equal(updates.length, 0);
});

test("missing session is not found", async () => {
  const updates = [];
  const deletes = [];
  const sets = [];
  const db = mockRematchDb({
    sessionData: {},
    sessionExists: false,
    updates,
    deletes,
    sets,
  });

  await assert.rejects(
    () => resetSessionForRematchHandler(db, "host", "sess-1"),
    (error) =>
      error instanceof Error && error.message === REMATCH_SESSION_NOT_FOUND,
  );
});
