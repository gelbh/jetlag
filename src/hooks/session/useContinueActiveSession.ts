import { useState } from "react";
import {
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "@/domain/map/annotations";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "@/domain/session/players/playerRole";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import { useSessionExit } from "@/hooks/session/useSessionExit";
import { setPremiumApiContext } from "@/services/core/auth/premiumApiContext";
import {
  ensureFreshAnonymousUser,
  isFirebaseConfigured,
} from "@/services/core/firebase/firebase";
import { withTimeout } from "@/services/core/withTimeout";
import { isFirestorePermissionDenied } from "@/services/firestore/firestoreAnnotations";
import {
  getRemoteSessionById,
  healSessionMembership,
  lookupRemoteSessionByCode,
} from "@/services/firestore/sessionMembershipHeal";
import { useSessionStore } from "@/state/sessionStore";

const VERIFY_SESSION_TIMEOUT_MS = 15_000;
const VERIFY_SESSION_TIMEOUT_MESSAGE =
  "Couldn't verify the session. Check your connection and try again.";

export function useContinueActiveSession(): {
  session: SessionRecord | null;
  myRole: PlayerRole | null;
  continueError: string | null;
  continuing: boolean;
  handleContinue: () => Promise<void>;
} {
  const navigate = useAppNavigate();
  const exitSession = useSessionExit();
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    if (!session) {
      return;
    }

    setContinueError(null);
    setContinuing(true);

    try {
      if (!isFirebaseConfigured() || session.id === LOCAL_SESSION_ID) {
        navigate("/map");
        return;
      }

      await withTimeout(
        (async () => {
          const user = await ensureFreshAnonymousUser();
          let remoteSession = null;
          try {
            remoteSession = await getRemoteSessionById(session.id);
          } catch (error) {
            if (!isFirestorePermissionDenied(error)) {
              throw error;
            }
          }

          if (!remoteSession) {
            const lookup = await lookupRemoteSessionByCode(session.code);
            if (lookup.status === "missing") {
              await exitSession({
                reason: "reset",
                sessionId: session.id,
                animate: false,
              });
              setContinueError("That session no longer exists.");
              return;
            }
            if (lookup.status === "ended") {
              await exitSession({
                reason: "reset",
                sessionId: session.id,
                animate: false,
              });
              setContinueError(
                "That session has ended. Join or create a new one."
              );
              return;
            }
            remoteSession = lookup.session;
          }

          if (remoteSession.endedAt) {
            await exitSession({
              reason: "reset",
              sessionId: session.id,
              animate: false,
            });
            setContinueError(
              "That session has ended. Join or create a new one."
            );
            return;
          }

          const resumeRole =
            myRole ??
            resolvePlayerRole(remoteSession.memberRoles, myUid ?? user.uid);
          const activeSession = await healSessionMembership(
            remoteSession,
            user.uid,
            resumeRole,
            { returningMemberUid: myUid, persistedMyUid: myUid }
          );

          const role = resolvePlayerRole(activeSession.memberRoles, user.uid);
          if (
            myRole &&
            activeSession.memberRoles &&
            activeSession.memberRoles[user.uid] &&
            myRole !== role
          ) {
            setContinueError(
              "Your role changed for this session. Rejoin with a new code."
            );
            return;
          }

          setSession(activeSession, user.uid);
          setPremiumApiContext(activeSession);
          navigate("/map");
        })(),
        VERIFY_SESSION_TIMEOUT_MS,
        VERIFY_SESSION_TIMEOUT_MESSAGE
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't continue that session.";
      if (
        message === "That session no longer exists." ||
        message === "That session has ended. Join or create a new one."
      ) {
        await exitSession({
          reason: "reset",
          sessionId: session.id,
          animate: false,
        });
      }
      setContinueError(message);
    } finally {
      setContinuing(false);
    }
  };

  return {
    session,
    myRole,
    continueError,
    continuing,
    handleContinue,
  };
}
