import { useEffect } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { resolvePlayerRole } from "../../domain/session/playerRole";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import {
  healSessionMembership,
  sessionMembershipChanged,
} from "../../services/firestore/sessionMembershipHeal";
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
        const healedSession = await healSessionMembership(
          session,
          user.uid,
          role,
          { returningMemberUid: myUid, persistedMyUid: myUid },
        );

        if (cancelled) {
          return;
        }

        const latestSession = useSessionStore.getState().session;
        const latestMyUid = useSessionStore.getState().myUid;
        if (
          sessionMembershipChanged(
            latestSession ?? session,
            healedSession,
            user.uid,
            latestMyUid,
          )
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
