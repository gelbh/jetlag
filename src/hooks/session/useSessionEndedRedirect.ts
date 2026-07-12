import { useEffect } from "react";
import { useAppNavigate } from "../useAppNavigate";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { clearSessionLocalArtifacts } from "../../services/session/sessionCleanup";
import { useSessionStore } from "../../state/sessionStore";

export function useSessionEndedRedirect(
  sessionId: string | undefined,
  isHost: boolean,
) {
  const navigate = useAppNavigate();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const setRemoteUpdateNotice = useSessionStore(
    (state) => state.setRemoteUpdateNotice,
  );

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

    void clearSessionLocalArtifacts(sessionId).then(() => {
      setSession(null);
      setRemoteUpdateNotice("The host ended this session.");
      navigate("/");
    });
  }, [
    isHost,
    navigate,
    session?.endedAt,
    session?.id,
    sessionId,
    setRemoteUpdateNotice,
    setSession,
  ]);
}
