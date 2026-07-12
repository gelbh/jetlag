import { useEffect } from "react";
import { useAppNavigate } from "../useAppNavigate";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { useSessionExit } from "./useSessionExit";
import { useSessionStore } from "../../state/sessionStore";

export function useSessionEndedRedirect(
  sessionId: string | undefined,
  isHost: boolean,
  exitPath = "/",
) {
  const exitSession = useSessionExit();
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    if (
      isHost ||
      !sessionId ||
      sessionId === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    if (session?.id !== sessionId || !session.endedAt) {
      return;
    }

    void exitSession({
      reason: "remote-ended",
      sessionId,
      navigateTo: exitPath,
      remoteNotice: "The host ended this session.",
    });
  }, [
    exitPath,
    exitSession,
    isHost,
    session?.endedAt,
    session?.id,
    sessionId,
  ]);
}
