import { useCallback, useEffect, useState } from "react";
import { LOCAL_SESSION_ID, type SessionRecord } from "../../domain/map/annotations";
import { useSessionExit } from "../session/useSessionExit";
import { resetSessionForRematch } from "../../services/session/sessionRematch";
import { mapRematchError } from "../../services/session/sessionRematchErrors";
import { teardownSessionUiState } from "../../services/session/sessionCleanup";
import { clearLiveLocationOnLeave } from "../../services/session/clearLiveLocationOnLeave";
import {
  allowPlayerLocationPublishes,
  blockPlayerLocationPublishes,
} from "../../services/session/playerLocationPublishGate";
import { ensureAnonymousUser } from "../../services/core/firebase/firebase";
import { useTimerStore } from "../../state/timerStore";
import { useGameOver } from "./useGameOver";

interface GameOverOverlay {
  closeSheet: () => void;
}

export function useGameOverActions(
  session: SessionRecord | null | undefined,
  overlay: GameOverOverlay,
) {
  const exitSession = useSessionExit();
  const gameOver = useGameOver(session);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  const rematchSessionId = session?.id;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hold rematch CTA until the game-over sheet unmounts */
    if (!gameOver.roundComplete) {
      setRematchPending(false);
      setRematchError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [gameOver.roundComplete]);

  const handleRematch = useCallback(async () => {
    if (!rematchSessionId || rematchSessionId === LOCAL_SESSION_ID) {
      return;
    }

    setRematchError(null);
    setRematchPending(true);
    try {
      await resetSessionForRematch(rematchSessionId);
      teardownSessionUiState();
      useTimerStore.getState().clearTimer(rematchSessionId);
    } catch (error) {
      setRematchError(mapRematchError(error));
      setRematchPending(false);
    }
  }, [rematchSessionId]);

  const handleGameOverHome = useCallback(() => {
    if (!session) {
      return;
    }

    void (async () => {
      if (session.id !== LOCAL_SESSION_ID) {
        blockPlayerLocationPublishes();
        try {
          const user = await ensureAnonymousUser();
          await clearLiveLocationOnLeave({
            sessionId: session.id,
            uid: user.uid,
            role: session.memberRoles?.[user.uid] ?? "seeker",
            pendingQuestions: [],
          });
        } catch {
          // Best-effort pin clear; still leave home.
        }
      }

      try {
        await exitSession({
          reason: "leave",
          sessionId: session.id,
          replace: true,
          closeOverlays: overlay.closeSheet,
        });
      } catch {
        allowPlayerLocationPublishes();
      }
    })();
  }, [exitSession, overlay.closeSheet, session]);

  return {
    gameOver,
    rematchPending,
    rematchError,
    handleRematch,
    handleGameOverHome,
  };
}
