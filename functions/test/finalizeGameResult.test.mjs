import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGameResultDocument,
  buildGameResultPlayers,
  computeDurationMs,
  finalizeGameResultForSession,
  handleFinalizeGameResultWrite,
  shouldFinalizeGameResult,
} from "../session/finalizeGameResult.mjs";

function firestoreChange(before, after) {
  return {
    before: before ? { data: () => before } : undefined,
    after: after ? { data: () => after } : undefined,
  };
}

function createFinalizeMockDb() {
  const state = {
    gameResults: new Map(),
    sessionUpdate: null,
  };

  function createSessionRef() {
    return {
      collection(subName) {
        assert.equal(subName, "gameResult");
        return {
          doc(gameResultId) {
            return { gameResultId };
          },
        };
      },
    };
  }

  return {
    get gameResults() {
      return state.gameResults;
    },
    get sessionUpdate() {
      return state.sessionUpdate;
    },
    collection(name) {
      assert.equal(name, "sessions");
      return {
        doc() {
          return createSessionRef();
        },
      };
    },
    async runTransaction(callback) {
      const sessionRef = createSessionRef();
      await callback({
        set(ref, payload) {
          state.gameResults.set(ref.gameResultId, payload);
        },
        update(_ref, payload) {
          state.sessionUpdate = payload;
        },
      });
    },
  };
}

test("shouldFinalizeGameResult triggers on found confirm or ended_early", () => {
  assert.equal(
    shouldFinalizeGameResult(
      { foundConfirmedAt: undefined },
      { foundConfirmedAt: "2026-01-01T01:00:00.000Z", gameOutcome: "found" },
    ),
    true,
  );
  assert.equal(
    shouldFinalizeGameResult(
      { gameOutcome: undefined },
      { gameOutcome: "ended_early" },
    ),
    true,
  );
  assert.equal(
    shouldFinalizeGameResult(
      { gameOutcome: "ended_early", gameResultId: "existing" },
      { gameOutcome: "ended_early", gameResultId: "existing" },
    ),
    false,
  );
});

test("computeDurationMs adds running segment to accumulated timer", () => {
  assert.equal(
    computeDurationMs(
      {
        timerAccumulatedMs: 60_000,
        timerRunningSince: "2026-01-01T00:00:00.000Z",
      },
      "2026-01-01T00:10:00.000Z",
    ),
    660_000,
  );
  assert.equal(
    computeDurationMs(
      {
        timerAccumulatedMs: 60_000,
        timerRunningSince: null,
      },
      "2026-01-01T00:10:00.000Z",
    ),
    60_000,
  );
});

test("buildGameResultPlayers assigns winners by outcome", () => {
  const players = buildGameResultPlayers(
    {
      "seeker-1": "seeker",
      "hider-1": "hider",
      "observer-1": "observer",
    },
    "found",
  );

  assert.deepEqual(players, [
    {
      uid: "seeker-1",
      role: "seeker",
      distanceMeters: 0,
      maxDistanceFromStartMeters: 0,
      won: true,
    },
    {
      uid: "hider-1",
      role: "hider",
      distanceMeters: 0,
      maxDistanceFromStartMeters: 0,
      won: false,
    },
  ]);
});

test("buildGameResultDocument builds basic round summary", () => {
  const result = buildGameResultDocument("session-1", {
    roundNumber: 2,
    gameSize: "large",
    gameOutcome: "ended_early",
    endGameStartedAt: "2026-01-01T01:00:00.000Z",
    timerAccumulatedMs: 120_000,
    timerRunningSince: null,
    memberRoles: {
      "seeker-1": "seeker",
      "hider-1": "hider",
    },
  });

  assert.equal(result.sessionId, "session-1");
  assert.equal(result.roundNumber, 2);
  assert.equal(result.gameSize, "large");
  assert.equal(result.outcome, "ended_early");
  assert.equal(result.durationMs, 120_000);
  assert.equal(result.players.length, 2);
  assert.equal(result.players.find((player) => player.uid === "hider-1")?.won, true);
});

test("finalizeGameResultForSession writes gameResult and session gameResultId", async () => {
  const db = createFinalizeMockDb();

  const { gameResultId, gameResult } = await finalizeGameResultForSession(
    db,
    "session-1",
    {
      foundConfirmedAt: "2026-01-01T01:00:00.000Z",
      gameOutcome: "found",
      timerAccumulatedMs: 30_000,
      timerRunningSince: "2026-01-01T00:30:00.000Z",
      memberRoles: { "seeker-1": "seeker", "hider-1": "hider" },
    },
  );

  assert.match(gameResultId, /^[0-9a-f-]{36}$/);
  assert.equal(gameResult.outcome, "found");
  assert.deepEqual(db.sessionUpdate, { gameResultId });
  assert.ok(db.gameResults.has(gameResultId));
});

test("handleFinalizeGameResultWrite ignores unrelated session updates", async () => {
  const db = createFinalizeMockDb();

  await handleFinalizeGameResultWrite(db, {
    params: { sessionId: "session-1" },
    data: firestoreChange(
      { timerAccumulatedMs: 0 },
      { timerAccumulatedMs: 1000 },
    ),
  });

  assert.equal(db.gameResults.size, 0);
  assert.equal(db.sessionUpdate, null);
});
