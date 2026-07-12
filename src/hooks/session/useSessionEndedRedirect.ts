import { useEffect } from "react";
import { useAppNavigate } from "../useAppNavigate";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { subscribeToSession } from "../../services/firestore/firestoreAnnotations";
import { clearSessionLocalArtifacts } from "../../services/session/sessionCleanup";
import { useSessionStore } from "../../state/sessionStore";

export function useSessionEndedRedirect(
  sessionId: string | undefined,
  isHost: boolean,
) {
  const navigate = useAppNavigate();
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

    return subscribeToSession(
      sessionId,
      (remoteSession) => {
        if (!remoteSession.endedAt) {
          return;
        }

        void clearSessionLocalArtifacts(sessionId).then(() => {
          setSession(null);
          setRemoteUpdateNotice("The host ended this session.");
          navigate("/");
        });
      },
      () => {
        // Session sync errors are surfaced elsewhere on the map screen.
      },
    );
  }, [isHost, navigate, sessionId, setRemoteUpdateNotice, setSession]);
}
