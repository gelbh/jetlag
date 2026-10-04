import assert from "node:assert/strict";
import test from "node:test";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  isAbandonedSessionPastRetention,
  isEndedSessionPastRetention,
  purgeSelectedSessions,
  selectSessionsToPurge,
} from "../session/purgeStaleSessions.mjs";

function fakeSnapshot(id, data) {
  return {
    id,
    data: () => data,
  };
}

function makePurgeTarget(id, code) {
  return {
    id,
    data: () => ({ code }),
    ref: { path: `sessions/${id}` },
  };
}

function makePurgeDb({ failSessionIds = new Set() } = {}) {
  const deletedCodes = [];
  const deletedRefs = [];

  return {
    deletedCodes,
    deletedRefs,
    db: {
      recursiveDelete: async (ref) => {
        const sessionId = String(ref.path).split("/")[1];
        if (failSessionIds.has(sessionId)) {
          throw new Error("354 deletes failed. The last delete failed with: ");
        }
        deletedRefs.push(ref.path);
      },
      collection: (name) => {
        assert.equal(name, "sessionCodes");
        return {
          doc: (code) => ({
            delete: async () => {
              deletedCodes.push(code);
            },
          }),
        };
      },
    },
  };
}

test("isEndedSessionPastRetention requires ended status and old endedAt", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  assert.equal(
    isEndedSessionPastRetention({ status: "ended", endedAt: "2026-05-01T00:00:00.000Z" }, cutoff),
    true,
  );
  assert.equal(
    isEndedSessionPastRetention({ status: "ended", endedAt: "2026-06-15T00:00:00.000Z" }, cutoff),
    false,
  );
  assert.equal(
    isEndedSessionPastRetention({ status: "active", endedAt: "2026-05-01T00:00:00.000Z" }, cutoff),
    false,
  );
});

test("isAbandonedSessionPastRetention ignores ended sessions", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  assert.equal(
    isAbandonedSessionPastRetention({ createdAt: "2026-05-01T00:00:00.000Z" }, cutoff),
    true,
  );
  assert.equal(
    isAbandonedSessionPastRetention(
      { status: "ended", endedAt: "2026-05-01T00:00:00.000Z" },
      cutoff,
    ),
    false,
  );
});

test("computeEndedCutoffIso and computeAbandonedCutoffIso subtract retention days", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");
  assert.equal(computeEndedCutoffIso(now, 7), "2026-07-03T12:00:00.000Z");
  assert.equal(computeAbandonedCutoffIso(now, 30), "2026-06-10T12:00:00.000Z");
});

test("selectSessionsToPurge caps work and deduplicates", () => {
  const endedCutoff = "2026-06-01T00:00:00.000Z";
  const abandonedCutoff = "2026-06-01T00:00:00.000Z";
  const ended = [
    fakeSnapshot("ended-1", {
      status: "ended",
      endedAt: "2026-05-01T00:00:00.000Z",
    }),
    fakeSnapshot("ended-2", {
      status: "ended",
      endedAt: "2026-07-01T00:00:00.000Z",
    }),
  ];
  const abandoned = [
    fakeSnapshot("abandoned-1", { createdAt: "2026-05-01T00:00:00.000Z" }),
    fakeSnapshot("ended-1", {
      status: "ended",
      endedAt: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
    }),
  ];

  const selected = selectSessionsToPurge(ended, abandoned, endedCutoff, abandonedCutoff, 2);

  assert.deepEqual(
    selected.map((snapshot) => snapshot.id),
    ["ended-1", "abandoned-1"],
  );
});

test("purgeSelectedSessions continues after per-session recursiveDelete failure", async () => {
  const { db, deletedCodes, deletedRefs } = makePurgeDb({
    failSessionIds: new Set(["bad"]),
  });
  const captured = [];

  const deleted = await purgeSelectedSessions(
    db,
    [makePurgeTarget("bad", "BAD1"), makePurgeTarget("good", "GOOD1")],
    {
      captureException: (error) => {
        captured.push(error);
      },
    },
  );

  assert.equal(deleted, 1);
  assert.deepEqual(deletedRefs, ["sessions/good"]);
  assert.deepEqual(deletedCodes, ["GOOD1"]);
  assert.equal(captured.length, 1);
  assert.match(String(captured[0].message), /354 deletes failed/);
});

test("purgeSelectedSessions deletes session code after recursiveDelete", async () => {
  const { db, deletedCodes, deletedRefs } = makePurgeDb();

  const deleted = await purgeSelectedSessions(db, [
    makePurgeTarget("s1", "CODE1"),
    makePurgeTarget("s2", ""),
  ]);

  assert.equal(deleted, 2);
  assert.deepEqual(deletedRefs, ["sessions/s1", "sessions/s2"]);
  assert.deepEqual(deletedCodes, ["CODE1"]);
});
