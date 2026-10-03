import { FieldValue } from "firebase-admin/firestore";
import { readMembershipFields } from "./roleGateShared.mjs";

/** Intents the trigger first sees after this long (retry storms) are dropped as `stale`. */
export const INTENT_MAX_AGE_MS = 30 * 60_000;

/**
 * Earlier unprocessed intents drained per invocation. Trigger delivery order is
 * not guaranteed, so a queued offline pause+resume pair can arrive resume-first;
 * draining earlier intents in `createdAt` order keeps the timer from sticking paused.
 */
export const INTENT_DRAIN_LIMIT = 25;

function toMillis(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return Number.NaN;
}

function readTimerState(session) {
  const accumulatedMs =
    typeof session.timerAccumulatedMs === "number" && Number.isFinite(session.timerAccumulatedMs)
      ? Math.max(0, session.timerAccumulatedMs)
      : 0;
  const runningSinceMs =
    typeof session.timerRunningSince === "string" ? Date.parse(session.timerRunningSince) : NaN;
  return {
    accumulatedMs,
    runningSinceMs: Number.isFinite(runningSinceMs) ? runningSinceMs : null,
  };
}

function compareIntents(a, b) {
  const byCreated = (a.createdMs || 0) - (b.createdMs || 0);
  if (byCreated !== 0) {
    return byCreated;
  }
  const byRequested = (Number(a.data.requestedAtMs) || 0) - (Number(b.data.requestedAtMs) || 0);
  if (byRequested !== 0) {
    return byRequested;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Pure fold of one intent onto the timer state. Returns the outcome and the
 * next state (unchanged unless `applied`).
 *
 * Pause applies at the hider's play time (skew-corrected client ms), clamped to
 * [max(runningSince, now - INTENT_MAX_AGE_MS), now]: a Move queued in a dead
 * zone is fair, and a forged `requestedAtMs` can neither extend the timer past
 * now nor rewind it more than the intent max age.
 *
 * Resume uses server `now`, not play time: the hider must reconnect for the new
 * zone to reach seekers anyway, and resuming at receipt never credits the hider
 * for time seekers could not act on.
 */
export function applyIntentToTimer({ intent, session, state, nowMs }) {
  const createdMs = toMillis(intent.createdAt);
  if (Number.isFinite(createdMs) && nowMs - createdMs > INTENT_MAX_AGE_MS) {
    return { status: "stale", reason: null, state };
  }
  if (!session) {
    return { status: "rejected", reason: "session-missing", state };
  }
  if (session.status === "ended" || typeof session.endedAt === "string") {
    return { status: "rejected", reason: "session-ended", state };
  }

  const { memberUids, memberRoles } = readMembershipFields(session);
  if (
    typeof intent.uid !== "string" ||
    !memberUids.includes(intent.uid) ||
    memberRoles[intent.uid] !== "hider"
  ) {
    return { status: "rejected", reason: "not-hider", state };
  }
  if (intent.type !== "moveTimer") {
    return { status: "rejected", reason: "unknown-type", state };
  }

  const { accumulatedMs, runningSinceMs } = state;
  const running = runningSinceMs !== null;

  if (intent.action === "pause") {
    if (!running) {
      return { status: "noop", reason: "already-paused", state };
    }
    const requested = Number(intent.requestedAtMs);
    const floor = Math.max(runningSinceMs, nowMs - INTENT_MAX_AGE_MS);
    const at = Math.min(nowMs, Math.max(Number.isFinite(requested) ? requested : nowMs, floor));
    return {
      status: "applied",
      reason: null,
      state: {
        accumulatedMs: accumulatedMs + Math.max(0, at - runningSinceMs),
        runningSinceMs: null,
      },
    };
  }

  if (intent.action === "resume") {
    if (running) {
      return { status: "noop", reason: "already-running", state };
    }
    return { status: "applied", reason: null, state: { accumulatedMs, runningSinceMs: nowMs } };
  }

  return { status: "rejected", reason: "bad-action", state };
}

/**
 * Idempotent processor for `sessions/{sessionId}/intents/{intentId}`.
 * Firestore triggers are at-least-once and unordered: `processedAt` (written in
 * the same transaction as the timer change) makes redelivery a `noop`, and
 * earlier unprocessed intents are folded first so out-of-order delivery still
 * yields play order.
 *
 * @returns {Promise<{ status: "applied" | "noop" | "stale" | "rejected"; reason?: string | null }>}
 *   Outcome for `intentId` (other drained intents are marked but not returned).
 */
export async function processSessionIntentHandler(db, sessionId, intentId, nowMs = Date.now()) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const intentsRef = sessionRef.collection("intents");
  const intentRef = intentsRef.doc(intentId);

  return db.runTransaction(async (tx) => {
    const [intentSnap, sessionSnap] = await Promise.all([tx.get(intentRef), tx.get(sessionRef)]);
    if (!intentSnap.exists) {
      return { status: "noop", reason: "missing" };
    }
    const target = intentSnap.data() ?? {};
    if (target.processedAt) {
      return { status: "noop", reason: "already-processed" };
    }

    const pending = new Map();
    pending.set(intentId, {
      id: intentId,
      ref: intentRef,
      data: target,
      createdMs: toMillis(target.createdAt),
    });

    if (target.createdAt && Number.isFinite(toMillis(target.createdAt))) {
      const earlier = await tx.get(
        intentsRef
          .where("createdAt", "<=", target.createdAt)
          .orderBy("createdAt")
          .limit(INTENT_DRAIN_LIMIT),
      );
      for (const doc of earlier.docs) {
        const data = doc.data() ?? {};
        if (doc.id === intentId || data.processedAt) {
          continue;
        }
        pending.set(doc.id, {
          id: doc.id,
          ref: doc.ref,
          data,
          createdMs: toMillis(data.createdAt),
        });
      }
    }

    const session = sessionSnap.exists ? (sessionSnap.data() ?? {}) : null;
    const initial = session ? readTimerState(session) : { accumulatedMs: 0, runningSinceMs: null };
    let state = initial;
    let targetOutcome = { status: "noop", reason: null };

    for (const entry of [...pending.values()].sort(compareIntents)) {
      const outcome = applyIntentToTimer({ intent: entry.data, session, state, nowMs });
      state = outcome.state;
      tx.update(entry.ref, {
        processedAt: FieldValue.serverTimestamp(),
        status: outcome.status,
        reason: outcome.reason ?? null,
      });
      if (entry.id === intentId) {
        targetOutcome = { status: outcome.status, reason: outcome.reason ?? null };
      }
    }

    if (
      session &&
      (state.accumulatedMs !== initial.accumulatedMs ||
        state.runningSinceMs !== initial.runningSinceMs)
    ) {
      tx.update(sessionRef, {
        timerAccumulatedMs: state.accumulatedMs,
        timerRunningSince:
          state.runningSinceMs === null
            ? FieldValue.delete()
            : new Date(state.runningSinceMs).toISOString(),
      });
    }

    return targetOutcome;
  });
}
