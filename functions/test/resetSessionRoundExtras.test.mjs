import test from "node:test";
import assert from "node:assert/strict";
import { resetSessionRoundExtras } from "../session/resetSessionRoundExtras.mjs";

/**
 * Small fake Admin Firestore that records update/delete paths for rematch extras.
 */
function mockExtrasDb({
  memberUids = ["u1"],
  annotations = [],
  pendingQuestions = [],
  playerLocations = [],
  hidingZones = [],
  timeTraps = [],
  startingLocations = [],
  boardEconomyStateExists = true,
  endGameTruthAnchorsExists = false,
  trailPointsByUid = {},
}) {
  const updates = [];
  const deletes = [];
  const sessionPath = "sessions/sess-1";

  function docSnap(exists, data, ref) {
    return {
      exists,
      id: ref.id,
      ref,
      data: () => data,
    };
  }

  function makeCollection(name, docs, { supportsWhere = false } = {}) {
    const path = `${sessionPath}/${name}`;
    const refs = docs.map((doc) => ({
      id: doc.id,
      path: `${path}/${doc.id}`,
      data: doc.data,
    }));

    return {
      where(field, op, value) {
        if (!supportsWhere) {
          throw new Error(`where not supported on ${name}`);
        }
        return {
          async get() {
            const filtered = refs.filter((ref) => {
              const data = ref.data;
              if (op === "==") {
                return data[field] === value;
              }
              return false;
            });
            return {
              empty: filtered.length === 0,
              docs: filtered.map((ref) =>
                docSnap(true, ref.data, { id: ref.id, path: ref.path }),
              ),
            };
          },
        };
      },
      doc(id) {
        const existing = refs.find((r) => r.id === id);
        const ref = {
          id,
          path: `${path}/${id}`,
        };
        return {
          ...ref,
          async get() {
            if (!existing && name === "boardEconomy" && id === "state") {
              return docSnap(boardEconomyStateExists, {}, ref);
            }
            if (!existing && name === "endGameTruth" && id === "anchors") {
              return docSnap(endGameTruthAnchorsExists, {}, ref);
            }
            return docSnap(Boolean(existing), existing?.data ?? {}, ref);
          },
          collection(sub) {
            if (name === "playerTrailPoints" && sub === "points") {
              const points = trailPointsByUid[id] ?? [];
              return makeCollection(`playerTrailPoints/${id}/points`, points);
            }
            throw new Error(`unexpected nested ${name}/${sub}`);
          },
        };
      },
      async get() {
        return {
          empty: refs.length === 0,
          docs: refs.map((ref) =>
            docSnap(true, ref.data, { id: ref.id, path: ref.path }),
          ),
        };
      },
    };
  }

  const subcollections = {
    annotations: makeCollection("annotations", annotations, {
      supportsWhere: true,
    }),
    pendingQuestions: makeCollection("pendingQuestions", pendingQuestions),
    playerLocations: makeCollection("playerLocations", playerLocations),
    hidingZones: makeCollection("hidingZones", hidingZones),
    timeTraps: makeCollection("timeTraps", timeTraps),
    startingLocations: makeCollection("startingLocations", startingLocations),
    boardEconomy: makeCollection(
      "boardEconomy",
      boardEconomyStateExists ? [{ id: "state", data: { seed: 1 } }] : [],
    ),
    endGameTruth: makeCollection(
      "endGameTruth",
      endGameTruthAnchorsExists ? [{ id: "anchors", data: { anchors: {} } }] : [],
    ),
    playerTrailPoints: {
      doc(uid) {
        const points = trailPointsByUid[uid] ?? [];
        return {
          id: uid,
          path: `${sessionPath}/playerTrailPoints/${uid}`,
          collection(sub) {
            if (sub !== "points") {
              throw new Error(`unexpected trail sub ${sub}`);
            }
            return makeCollection(`playerTrailPoints/${uid}/points`, points);
          },
        };
      },
    },
  };

  const sessionRef = {
    id: "sess-1",
    path: sessionPath,
    async get() {
      return docSnap(true, { memberUids }, sessionRef);
    },
    collection(name) {
      const col = subcollections[name];
      if (!col) {
        throw new Error(`unexpected sub ${name}`);
      }
      return col;
    },
  };

  return {
    updates,
    deletes,
    collection(name) {
      if (name !== "sessions") {
        throw new Error(`unexpected ${name}`);
      }
      return {
        doc() {
          return sessionRef;
        },
      };
    },
    batch() {
      const ops = [];
      return {
        update(ref, payload) {
          ops.push({ type: "update", ref, payload });
        },
        delete(ref) {
          ops.push({ type: "delete", ref });
        },
        async commit() {
          for (const op of ops) {
            if (op.type === "update") {
              updates.push({
                path: op.ref.path ?? op.ref.id,
                payload: op.payload,
              });
            } else {
              deletes.push(op.ref.path ?? op.ref.id);
            }
          }
        },
      };
    },
  };
}

test("resetSessionRoundExtras deletes map/live docs and soft-clears annotations/questions", async () => {
  const db = mockExtrasDb({
    memberUids: ["u1"],
    annotations: [
      { id: "a1", data: { status: "active", kind: "pin" } },
      { id: "a2", data: { status: "deleted", kind: "zone" } },
    ],
    pendingQuestions: [
      { id: "q1", data: { status: "walking", type: "radar" } },
      { id: "q2", data: { status: "cancelled", type: "matching" } },
      { id: "q3", data: { status: "pending", type: "thermometer" } },
    ],
    playerLocations: [{ id: "u1", data: { lat: 1, lng: 2 } }],
    hidingZones: [{ id: "u1", data: { geojson: {} } }],
    timeTraps: [{ id: "t1", data: { active: true } }],
    startingLocations: [{ id: "s1", data: { lat: 3, lng: 4 } }],
    boardEconomyStateExists: true,
    endGameTruthAnchorsExists: true,
    trailPointsByUid: {
      u1: [
        { id: "p1", data: { lat: 1 } },
        { id: "p2", data: { lat: 2 } },
      ],
    },
  });

  await resetSessionRoundExtras(db, "sess-1");

  const annotationUpdate = db.updates.find(
    (u) => u.path === "sessions/sess-1/annotations/a1",
  );
  assert.ok(annotationUpdate, "active annotation should be updated");
  assert.equal(annotationUpdate.payload.status, "deleted");
  assert.notEqual(
    annotationUpdate.payload.status,
    "cancelled",
    "annotations must use deleted, not cancelled",
  );
  assert.equal(typeof annotationUpdate.payload.updatedAt, "string");

  const walkingUpdate = db.updates.find(
    (u) => u.path === "sessions/sess-1/pendingQuestions/q1",
  );
  assert.ok(walkingUpdate, "walking question should be cancelled");
  assert.deepEqual(walkingUpdate.payload, { status: "cancelled" });

  const pendingUpdate = db.updates.find(
    (u) => u.path === "sessions/sess-1/pendingQuestions/q3",
  );
  assert.ok(pendingUpdate, "pending question should be cancelled");
  assert.deepEqual(pendingUpdate.payload, { status: "cancelled" });

  assert.ok(
    !db.updates.some((u) => u.path === "sessions/sess-1/pendingQuestions/q2"),
    "already-cancelled questions must not be touched",
  );
  assert.ok(
    !db.updates.some((u) => u.path === "sessions/sess-1/annotations/a2"),
    "already-deleted annotations must not be touched",
  );

  assert.ok(db.deletes.includes("sessions/sess-1/playerLocations/u1"));
  assert.ok(db.deletes.includes("sessions/sess-1/hidingZones/u1"));
  assert.ok(db.deletes.includes("sessions/sess-1/timeTraps/t1"));
  assert.ok(db.deletes.includes("sessions/sess-1/startingLocations/s1"));
  assert.ok(db.deletes.includes("sessions/sess-1/boardEconomy/state"));
  assert.ok(db.deletes.includes("sessions/sess-1/endGameTruth/anchors"));
  assert.ok(
    db.deletes.includes("sessions/sess-1/playerTrailPoints/u1/points/p1"),
  );
  assert.ok(
    db.deletes.includes("sessions/sess-1/playerTrailPoints/u1/points/p2"),
  );
});

test("resetSessionRoundExtras tolerates empty memberUids and missing collections", async () => {
  const db = mockExtrasDb({
    memberUids: [],
    annotations: [],
    pendingQuestions: [],
    playerLocations: [],
    hidingZones: [],
    timeTraps: [],
    startingLocations: [],
    boardEconomyStateExists: false,
    endGameTruthAnchorsExists: false,
  });

  await resetSessionRoundExtras(db, "sess-1");
  assert.equal(db.updates.length, 0);
  assert.equal(db.deletes.length, 0);
});
