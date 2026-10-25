import { useEffect, useState } from "react";
import { isEffectivelyOfflineNow } from "@/hooks/sync/isEffectivelyOfflineNow";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { resolvePlayerRole } from "../../domain/session/players/playerRole";
import {
  ensureFreshAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import {
  healSessionMembership,
  sessionMembershipChanged,
} from "../../services/firestore/sessionMembershipHeal";
import { useSessionStore } from "../../state/sessionStore";

/** Fail-open so hung heal cannot starve map extras forever. */
export const MEMBERSHIP_HEAL_FAIL_OPEN_MS = 12_000;

export function useEnsureSessionMembership(options?: { enabled?: boolean }): {
  membershipSettled: boolean;
} {
  const enabled = options?.enabled ?? true;
  const sessionId = useSessionStore((state) => state.session?.id);
  const myRole = useSessionStore((state) => state.myRole);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const sessionKey = sessionId ?? "";
  const [settledBySession, setSettledBySession] = useState<Record<string, boolean>>({});

  const needsHeal =
    enabled && Boolean(sessionId) && sessionId !== LOCAL_SESSION_ID && isFirebaseConfigured();

  useEffect(() => {
    if (!needsHeal || !sessionId) {
      return;
    }

    const session = useSessionStore.getState().session;
    if (!session || session.id !== sessionId) {
      return;
    }

    let cancelled = false;
    const markSettled = () => {
      if (cancelled) {
        return;
      }
      setSettledBySession((current) =>
        current[sessionKey] ? current : { ...current, [sessionKey]: true },
      );
    };

    const timeoutId = window.setTimeout(() => {
      markSettled();
    }, MEMBERSHIP_HEAL_FAIL_OPEN_MS);

    void (async () => {
      try {
        const user = await ensureFreshAnonymousUser({
          forceRefresh: !isEffectivelyOfflineNow(),
        });
        if (!cancelled) {
          const role = myRole ?? resolvePlayerRole(session.memberRoles, myUid ?? user.uid);
          const healedSession = await healSessionMembership(session, user.uid, role, {
            returningMemberUid: myUid,
            persistedMyUid: myUid,
          });

          if (!cancelled) {
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
            markSettled();
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLastSyncError(error instanceof Error ? error.message : "No access to this session.");
          markSettled();
        }
      }
      window.clearTimeout(timeoutId);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [needsHeal, sessionKey, sessionId, myRole, myUid, setLastSyncError, setSession]);

  if (!needsHeal) {
    return { membershipSettled: true };
  }

  return { membershipSettled: settledBySession[sessionKey] === true };
}
