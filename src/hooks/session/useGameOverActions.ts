import { useCallback, useState } from "react";
import { LOCAL_SESSION_ID, type SessionRecord } from "../../domain/map/annotations";
import { useSessionExit } from "../session/useSessionExit";
import { resetSessionForRematch } from "../../services/session/sessionRematch";
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

  const handleRematch = useCallback(async () => {
    if (!rematchSessionId || rematchSessionId === LOCAL_SESSION_ID) {
      return;
    }

    setRematchError(null);
    setRematchPending(true);
    try {
      await resetSessionForRematch(rematchSessionId);
    } catch {
      setRematchError("Could not start rematch. Try again.");
    } finally {
      setRematchPending(false);
    }
  }, [rematchSessionId]);

  const handleGameOverHome = useCallback(() => {
    if (!session) {
      return;
    }

    void exitSession({
      reason: "leave",
      sessionId: session.id,
      replace: true,
      closeOverlays: overlay.closeSheet,
    });
  }, [exitSession, overlay.closeSheet, session]);

  return {
    gameOver,
    rematchPending,
    rematchError,
    handleRematch,
    handleGameOverHome,
  };
}
