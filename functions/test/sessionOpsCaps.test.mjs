import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import {
  SESSION_OPS_CAPS,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  canConsumeTool,
  canConsumeTurn,
  canSummon,
  consumeSessionOpsSummon,
  consumeSessionOpsTool,
  consumeSessionOpsTurn,
  consumeSummon,
  consumeTool,
  consumeTurn,
  getSessionOpsCaps,
  isSessionOpsPremium,
  resolveSessionOpsCapTier,
  resolveSessionOpsCaps,
} from "../incident/sessionOpsCaps.mjs";

function createInMemoryFirestore() {
  const documents = new Map();

  function docPath(parts) {
    return parts.join("/");
  }

  function createDocRef(parts) {
    const path = docPath(parts);
    return {
      path,
      id: parts[parts.length - 1],
      get: async () => {
        const data = documents.get(path);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data, options = {}) => {
        if (options.merge) {
          documents.set(path, { ...(documents.get(path) ?? {}), ...data });
        } else {
          documents.set(path, { ...data });
        }
      },
      collection: (name) => ({
        doc: (id) => createDocRef([...parts, name, id]),
      }),
    };
  }

  return {
    documents,
    collection(name) {
      return {
        doc(id) {
          return createDocRef([name, id]);
        },
      };
    },
    async runTransaction(callback) {
      const pendingWrites = new Map();

      const transaction = {
        async get(ref) {
          if (pendingWrites.has(ref.path)) {
            const pending = pendingWrites.get(ref.path);
            return { exists: true, data: () => pending };
          }
          const data = documents.get(ref.path);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        set(ref, data, options = {}) {
          const base = options.merge
            ? {
                ...(pendingWrites.get(ref.path) ??
                  documents.get(ref.path) ??
                  {}),
                ...data,
              }
            : { ...data };
          pendingWrites.set(ref.path, base);
        },
      };

      const result = await callback(transaction);

      for (const [path, value] of pendingWrites.entries()) {
        documents.set(path, value);
      }

      return result;
    },
  };
}

test("sessionOpsCaps free vs premium match spec defaults", () => {
  assert.deepEqual(SESSION_OPS_CAPS.free, {
    summonsPerSession: 1,
    agentTurnsPerSummon: 12,
    toolExecutionsPerSummon: 6,
    globalToolAttemptsPerUidPerHour: 20,
  });
  assert.deepEqual(SESSION_OPS_CAPS.premium, {
    summonsPerSession: 5,
    agentTurnsPerSummon: 40,
    toolExecutionsPerSummon: 25,
    globalToolAttemptsPerUidPerHour: 60,
  });
  assert.deepEqual(getSessionOpsCaps("free"), SESSION_OPS_CAPS.free);
  assert.deepEqual(getSessionOpsCaps("premium"), SESSION_OPS_CAPS.premium);
});

test("isSessionOpsPremium uses entitlements and session tier", () => {
  assert.equal(
    isSessionOpsPremium({
      entitlementsData: { lifetimePremium: true },
      sessionTier: "free",
    }),
    true,
  );
  assert.equal(
    isSessionOpsPremium({
      entitlementsData: { subscription: { status: "active" } },
    }),
    true,
  );
  const future = Timestamp.fromMillis(Date.now() + 86_400_000);
  assert.equal(
    isSessionOpsPremium({ entitlementsData: { trialEndsAt: future } }),
    true,
  );
  assert.equal(
    isSessionOpsPremium({
      entitlementsData: {},
      sessionTier: "premium",
    }),
    true,
  );
  assert.equal(
    isSessionOpsPremium({
      entitlementsData: { subscription: { status: "canceled" } },
      sessionTier: "free",
    }),
    false,
  );
  assert.equal(
    resolveSessionOpsCapTier({ sessionTier: "premium" }),
    "premium",
  );
  assert.deepEqual(
    resolveSessionOpsCaps({ entitlementsData: { lifetimePremium: true } }),
    SESSION_OPS_CAPS.premium,
  );
});

test("pure consume-on-turn / consume-on-tool enforce per-summon caps", () => {
  const free = getSessionOpsCaps("free");
  assert.equal(canSummon({ summonCount: 0 }, free), true);
  assert.deepEqual(consumeSummon({ summonCount: 0 }, free), {
    ok: true,
    usage: { summonCount: 1 },
  });
  assert.deepEqual(consumeSummon({ summonCount: 1 }, free), {
    ok: false,
    code: SESSION_OPS_SUMMON_CAP,
  });

  let turns = { agentTurnCount: 0, toolExecutionCount: 0 };
  for (let i = 0; i < free.agentTurnsPerSummon; i += 1) {
    const next = consumeTurn(turns, free);
    assert.equal(next.ok, true);
    turns = next.usage;
  }
  assert.equal(canConsumeTurn(turns, free), false);
  assert.deepEqual(consumeTurn(turns, free), {
    ok: false,
    code: SESSION_OPS_TURN_CAP,
  });

  let tools = { agentTurnCount: 0, toolExecutionCount: 0 };
  for (let i = 0; i < free.toolExecutionsPerSummon; i += 1) {
    const next = consumeTool(tools, free);
    assert.equal(next.ok, true);
    tools = next.usage;
  }
  assert.equal(canConsumeTool(tools, free), false);
  assert.deepEqual(consumeTool(tools, free), {
    ok: false,
    code: SESSION_OPS_TOOL_CAP,
  });
});

test("Firestore consumeSummon / consumeTurn / consumeTool persist counters", async () => {
  const db = createInMemoryFirestore();
  const caps = getSessionOpsCaps("free");
  const now = () => new Date("2026-07-25T12:00:00.000Z");

  db.documents.set("incidents/inc-1", {
    sessionId: "sess-1",
    status: "open",
  });

  const summoned = await consumeSessionOpsSummon(db, {
    incidentId: "inc-1",
    summonId: "sum-1",
    uid: "uid-1",
    caps,
    now,
  });
  assert.equal(summoned.ok, true);
  assert.equal(summoned.usage.summonCount, 1);
  assert.equal(
    db.documents.get("incidents/inc-1").sessionOpsSummonCount,
    1,
  );
  assert.deepEqual(db.documents.get("incidents/inc-1/summons/sum-1"), {
    uid: "uid-1",
    agentTurnCount: 0,
    toolExecutionCount: 0,
    createdAt: "2026-07-25T12:00:00.000Z",
  });

  const secondSummon = await consumeSessionOpsSummon(db, {
    incidentId: "inc-1",
    summonId: "sum-2",
    uid: "uid-1",
    caps,
    now,
  });
  assert.equal(secondSummon.ok, false);
  assert.equal(secondSummon.code, SESSION_OPS_SUMMON_CAP);

  const turn = await consumeSessionOpsTurn(db, {
    incidentId: "inc-1",
    summonId: "sum-1",
    caps,
  });
  assert.equal(turn.ok, true);
  assert.equal(turn.usage.agentTurnCount, 1);
  assert.equal(
    db.documents.get("incidents/inc-1/summons/sum-1").agentTurnCount,
    1,
  );

  const tool = await consumeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      summonId: "sum-1",
      uid: "uid-1",
      caps,
      nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
    },
    {
      consumeGlobalToolAttempt: async () => ({ allowed: true }),
    },
  );
  assert.equal(tool.ok, true);
  assert.equal(tool.usage.toolExecutionCount, 1);
  assert.equal(
    db.documents.get("incidents/inc-1/summons/sum-1").toolExecutionCount,
    1,
  );

  // Host confirm approval consumes again — does not reset prior counts.
  const afterConfirm = await consumeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      summonId: "sum-1",
      uid: "uid-1",
      caps,
      nowMs: Date.parse("2026-07-25T12:01:00.000Z"),
    },
    {
      consumeGlobalToolAttempt: async () => ({ allowed: true }),
    },
  );
  assert.equal(afterConfirm.ok, true);
  assert.equal(afterConfirm.usage.toolExecutionCount, 2);
  assert.equal(
    db.documents.get("incidents/inc-1/summons/sum-1").agentTurnCount,
    1,
  );
});

test("consumeSessionOpsTool rolls back summon counter when global cap hits", async () => {
  const db = createInMemoryFirestore();
  const caps = getSessionOpsCaps("free");
  db.documents.set("incidents/inc-1", { sessionOpsSummonCount: 1 });
  db.documents.set("incidents/inc-1/summons/sum-1", {
    uid: "uid-1",
    agentTurnCount: 0,
    toolExecutionCount: 0,
    createdAt: "2026-07-25T12:00:00.000Z",
  });

  const denied = await consumeSessionOpsTool(
    db,
    {
      incidentId: "inc-1",
      summonId: "sum-1",
      uid: "uid-1",
      caps,
      nowMs: Date.parse("2026-07-25T12:00:00.000Z"),
    },
    {
      consumeGlobalToolAttempt: async () => ({
        allowed: false,
        retryAfterMs: 3_000,
      }),
    },
  );

  assert.equal(denied.ok, false);
  assert.equal(denied.code, SESSION_OPS_GLOBAL_TOOL_CAP);
  assert.equal(denied.retryAfterMs, 3_000);
  assert.equal(
    db.documents.get("incidents/inc-1/summons/sum-1").toolExecutionCount,
    0,
  );
});

test("premium summons allow more than free", async () => {
  const db = createInMemoryFirestore();
  const caps = getSessionOpsCaps("premium");
  const now = () => new Date("2026-07-25T12:00:00.000Z");
  db.documents.set("incidents/inc-1", { sessionId: "sess-1" });

  for (let i = 1; i <= 5; i += 1) {
    const result = await consumeSessionOpsSummon(db, {
      incidentId: "inc-1",
      summonId: `sum-${i}`,
      uid: "uid-1",
      caps,
      now,
    });
    assert.equal(result.ok, true, `summon ${i}`);
  }

  const sixth = await consumeSessionOpsSummon(db, {
    incidentId: "inc-1",
    summonId: "sum-6",
    uid: "uid-1",
    caps,
    now,
  });
  assert.equal(sixth.ok, false);
  assert.equal(sixth.code, SESSION_OPS_SUMMON_CAP);
});
