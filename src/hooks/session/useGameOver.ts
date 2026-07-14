import { useEffect, useMemo, useState } from "react";
import type { GameResultRecord } from "../../domain/game/gameResult";
import {
  LOCAL_SESSION_ID,
  isRoundComplete,
  type SessionRecord,
} from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { subscribeToGameResult } from "../../services/firestore/firestoreGameResult";

function buildLocalGameResult(session: SessionRecord): GameResultRecord {
  const endedAt =
    session.foundConfirmedAt ??
    session.endGameStartedAt ??
    new Date().toISOString();
  const durationMs =
    typeof session.timerAccumulatedMs === "number"
      ? session.timerAccumulatedMs
      : 0;

  return {
    sessionId: session.id,
    roundNumber: session.roundNumber ?? 0,
    gameSize: session.gameSize ?? "medium",
    outcome: session.gameOutcome ?? "found",
    endedAt,
    durationMs,
    seekTimeMs: durationMs,
    players: [],
  };
}

export function useGameOver(session: SessionRecord | null | undefined) {
  const sessionId = session?.id;
  const gameResultId = session?.gameResultId;
  const roundComplete = isRoundComplete(session);
  const subscribed =
    roundComplete &&
    Boolean(sessionId) &&
    Boolean(gameResultId) &&
    sessionId !== LOCAL_SESSION_ID &&
    isFirebaseConfigured();
  const [remoteResult, setRemoteResult] = useState<GameResultRecord | null>(
    null,
  );

  useEffect(() => {
    if (!subscribed || !sessionId || !gameResultId) {
      return;
    }

    return subscribeToGameResult(
      sessionId,
      gameResultId,
      setRemoteResult,
      () => {
        setRemoteResult(null);
      },
    );
  }, [gameResultId, sessionId, subscribed]);

  const result = useMemo(() => {
    if (!roundComplete || !session) {
      return null;
    }

    if (subscribed && remoteResult) {
      return remoteResult;
    }

    if (sessionId === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      return buildLocalGameResult(session);
    }

    return null;
  }, [remoteResult, roundComplete, session, sessionId, subscribed]);

  const loading =
    roundComplete &&
    !result &&
    Boolean(sessionId && sessionId !== LOCAL_SESSION_ID && isFirebaseConfigured());

  return {
    result,
    loading,
    roundComplete,
  };
}
