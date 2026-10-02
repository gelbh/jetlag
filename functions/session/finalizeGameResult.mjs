import { randomUUID } from "node:crypto";

export function shouldFinalizeGameResult(before, after) {
  if (!after) {
    return false;
  }

  if (typeof after.gameResultId === "string" && after.gameResultId.length > 0) {
    return false;
  }

  const foundConfirmedNewlySet =
    typeof before?.foundConfirmedAt !== "string" && typeof after.foundConfirmedAt === "string";

  const terminalNewlySet =
    (after.gameOutcome === "ended_early" || after.gameOutcome === "abandoned") &&
    before?.gameOutcome !== after.gameOutcome;

  return foundConfirmedNewlySet || terminalNewlySet;
}

export function computeDurationMs(session, endedAtIso) {
  const accumulatedMs =
    typeof session.timerAccumulatedMs === "number" ? session.timerAccumulatedMs : 0;

  if (typeof session.timerRunningSince !== "string") {
    return accumulatedMs;
  }

  const endedAtMs = Date.parse(endedAtIso);
  const runningSinceMs = Date.parse(session.timerRunningSince);
  if (!Number.isFinite(endedAtMs) || !Number.isFinite(runningSinceMs)) {
    return accumulatedMs;
  }

  return accumulatedMs + Math.max(0, endedAtMs - runningSinceMs);
}

function resolveEndedAt(session) {
  if (typeof session.endedAt === "string") {
    return session.endedAt;
  }

  if (typeof session.foundConfirmedAt === "string") {
    return session.foundConfirmedAt;
  }

  if (typeof session.endGameStartedAt === "string") {
    return session.endGameStartedAt;
  }

  return new Date().toISOString();
}

function resolveOutcome(session) {
  if (
    session.gameOutcome === "found" ||
    session.gameOutcome === "ended_early" ||
    session.gameOutcome === "abandoned"
  ) {
    return session.gameOutcome;
  }

  if (typeof session.foundConfirmedAt === "string") {
    return "found";
  }

  return "ended_early";
}

function playerWon(role, outcome) {
  if (outcome === "found") {
    return role === "seeker";
  }

  if (outcome === "ended_early") {
    return role === "hider";
  }

  return false;
}

export function buildGameResultPlayers(memberRoles, outcome) {
  const players = [];

  if (!memberRoles || typeof memberRoles !== "object") {
    return players;
  }

  for (const [uid, role] of Object.entries(memberRoles)) {
    if (role !== "seeker" && role !== "hider") {
      continue;
    }

    players.push({
      uid,
      role,
      distanceMeters: 0,
      maxDistanceFromStartMeters: 0,
      won: playerWon(role, outcome),
    });
  }

  return players;
}

function resolveHidingPeriodMs(session) {
  if (typeof session.hidingPeriodMinutes === "number") {
    return session.hidingPeriodMinutes * 60_000;
  }
  if (session.gameSize === "small") return 30 * 60_000;
  if (session.gameSize === "large") return 180 * 60_000;
  return 60 * 60_000;
}

function splitRoundPhaseMs(durationMs, hidingPeriodMs) {
  const duration = Math.max(0, durationMs);
  const period = Math.max(0, hidingPeriodMs);
  return {
    hidingPhaseMs: Math.min(duration, period),
    seekPhaseMs: Math.max(0, duration - period),
  };
}

export function buildGameResultDocument(sessionId, session) {
  const endedAt = resolveEndedAt(session);
  const durationMs = computeDurationMs(session, endedAt);
  const { hidingPhaseMs, seekPhaseMs } = splitRoundPhaseMs(
    durationMs,
    resolveHidingPeriodMs(session),
  );
  const outcome = resolveOutcome(session);
  const roundNumber = typeof session.roundNumber === "number" ? session.roundNumber : 0;
  const gameSize =
    session.gameSize === "small" || session.gameSize === "medium" || session.gameSize === "large"
      ? session.gameSize
      : "medium";

  return {
    sessionId,
    roundNumber,
    gameSize,
    outcome,
    endedAt,
    durationMs,
    hidingPhaseMs,
    seekPhaseMs,
    seekTimeMs: seekPhaseMs,
    players: buildGameResultPlayers(session.memberRoles, outcome),
  };
}

export async function finalizeGameResultForSession(db, sessionId, session) {
  const gameResultId = randomUUID();
  const gameResult = buildGameResultDocument(sessionId, session);
  const sessionRef = db.collection("sessions").doc(sessionId);

  await db.runTransaction(async (transaction) => {
    const liveSnap = await transaction.get(sessionRef);
    const live = liveSnap.data() ?? {};
    if (typeof live.gameResultId === "string" && live.gameResultId.length > 0) {
      return;
    }
    const complete =
      typeof live.foundConfirmedAt === "string" ||
      live.gameOutcome === "found" ||
      live.gameOutcome === "ended_early" ||
      live.gameOutcome === "abandoned";
    if (!complete) {
      return;
    }
    const gameResultRef = sessionRef.collection("gameResult").doc(gameResultId);
    transaction.set(gameResultRef, gameResult);
    transaction.update(sessionRef, { gameResultId });
  });

  return { gameResultId, gameResult };
}

export async function handleFinalizeGameResultWrite(db, event) {
  const sessionId = event.params.sessionId;
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!shouldFinalizeGameResult(before, after)) {
    return;
  }

  await finalizeGameResultForSession(db, sessionId, after);
}
