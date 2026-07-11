import { useEffect } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { resolvePlayerRole } from "../../domain/session/playerRole";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import { ensureRemoteSessionMembership } from "../../services/firestore/firestoreAnnotations";
import { useSessionStore } from "../../state/sessionStore";

export function useEnsureSessionMembership(): void {
  const sessionId = useSessionStore((state) => state.session?.id);
  const myRole = useSessionStore((state) => state.myRole);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);

  useEffect(() => {
    const session = useSessionStore.getState().session;
    if (
      !sessionId ||
      !session ||
      session.id !== sessionId ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const user = await ensureAnonymousUser();
        if (cancelled) {
          return;
        }

        const role =
          myRole ??
          resolvePlayerRole(session.memberRoles, myUid ?? user.uid);
        const healedSession = await ensureRemoteSessionMembership(
          session,
          user.uid,
          role,
          { returningMemberUid: myUid },
        );

        if (cancelled) {
          return;
        }

        const latestSession = useSessionStore.getState().session;
        const latestMyUid = useSessionStore.getState().myUid;
        if (
          healedSession.id !== latestSession?.id ||
          healedSession.memberUids.join(",") !==
            latestSession?.memberUids.join(",") ||
          user.uid !== latestMyUid
        ) {
          setSession(healedSession, user.uid);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLastSyncError(
          error instanceof Error
            ? error.message
            : "No access to this session.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [myRole, myUid, sessionId, setLastSyncError, setSession]);
}
