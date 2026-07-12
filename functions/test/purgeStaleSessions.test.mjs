import test from "node:test";
import assert from "node:assert/strict";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  isAbandonedSessionPastRetention,
  isEndedSessionPastRetention,
  selectSessionsToPurge,
} from "../session/purgeStaleSessions.mjs";

function fakeSnapshot(id, data) {
  return {
    id,
    data: () => data,
  };
}

test("isEndedSessionPastRetention requires ended status and old endedAt", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  assert.equal(
    isEndedSessionPastRetention(
      { status: "ended", endedAt: "2026-05-01T00:00:00.000Z" },
      cutoff,
    ),
    true,
  );
  assert.equal(
    isEndedSessionPastRetention(
      { status: "ended", endedAt: "2026-06-15T00:00:00.000Z" },
      cutoff,
    ),
    false,
  );
  assert.equal(
    isEndedSessionPastRetention(
      { status: "active", endedAt: "2026-05-01T00:00:00.000Z" },
      cutoff,
    ),
    false,
  );
});

test("isAbandonedSessionPastRetention ignores ended sessions", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  assert.equal(
    isAbandonedSessionPastRetention(
      { createdAt: "2026-05-01T00:00:00.000Z" },
      cutoff,
    ),
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
  assert.equal(
    computeEndedCutoffIso(now, 7),
    "2026-07-03T12:00:00.000Z",
  );
  assert.equal(
    computeAbandonedCutoffIso(now, 30),
    "2026-06-10T12:00:00.000Z",
  );
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

  const selected = selectSessionsToPurge(
    ended,
    abandoned,
    endedCutoff,
    abandonedCutoff,
    2,
  );

  assert.deepEqual(
    selected.map((snapshot) => snapshot.id),
    ["ended-1", "abandoned-1"],
  );
});
