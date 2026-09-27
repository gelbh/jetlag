import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules";
import { useChatUnread } from "./useChatUnread";
import {
  useHidingZonesSync,
  useHiderLocationsSync,
  usePendingQuestionsSync,
  useSeekerLocationsSync,
  useSessionMessagesSync,
} from "./useSessionExtrasSync";
import { useRemoteSessionTimerSync } from "./useRemoteSessionTimerSync";
import { useSeekingStartedActivity } from "./useSeekingStartedActivity";
import { useSessionEndedRedirect } from "./useSessionEndedRedirect";
import { useSessionSync } from "./useSessionSync";
import { useSessionTimer } from "./useSessionTimer";
import { useSyncStatus } from "../sync/useSyncStatus";
import { useFirebaseAuthReady } from "../sync/useFirebaseAuthReady";
import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import { waitForPermanentAuthReady } from "../../services/core/firebase/firebaseAuthReady";
import { setPremiumApiContext } from "../../services/core/auth/premiumApiContext";
import { useSessionStore } from "../../state/sessionStore";
import { useEnsureSessionMembership } from "./useEnsureSessionMembership";

export type SessionAuthMode =
  | "seeker-remote"
  | "hider-anonymous"
  | "admin-permanent";

export interface UseSharedSessionScreenOptions {
  isChatOpen: boolean;
  notificationRole: PlayerRole;
  authMode: SessionAuthMode;
  exitPath?: string;
}

export function useSharedSessionScreen({
  isChatOpen,
  notificationRole,
  authMode,
  exitPath = "/",
}: UseSharedSessionScreenOptions) {
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setMyUid = useSessionStore((state) => state.setMyUid);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const sessionId = session?.id;
  const anonymousAuthReady = useFirebaseAuthReady(
    authMode === "admin-permanent" ? null : session,
  );
  const [permanentAuthSessionId, setPermanentAuthSessionId] = useState<
    string | null
  >(null);
  const [authUid, setAuthUid] = useState<string | null>(null);

  useEffect(() => {
    setPremiumApiContext(session);
  }, [session]);

  useEnsureSessionMembership({ enabled: authMode !== "admin-permanent" });

  useEffect(() => {
    if (authMode === "admin-permanent") {
      if (
        !session ||
        session.id === LOCAL_SESSION_ID ||
        !isFirebaseConfigured()
      ) {
        return;
      }

      let cancelled = false;
      void waitForPermanentAuthReady().then(() => {
        if (cancelled) {
          return;
        }
        const currentUser = getFirebaseAuth().currentUser;
        if (myUid && currentUser && currentUser.uid !== myUid) {
          setLastSyncError("No access to this session.");
        }
        setPermanentAuthSessionId(session.id);
      });
      return () => {
        cancelled = true;
      };
    }

    if (authMode === "seeker-remote") {
      if (
        !session ||
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
          setAuthUid(user.uid);
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
    }

    let cancelled = false;
    void ensureAnonymousUser().then((user) => {
      if (cancelled) {
        return;
      }
      setAuthUid(user.uid);
      setMyUid(user.uid);
    });
    return () => {
      cancelled = true;
    };
  }, [authMode, myUid, session, session?.id, setLastSyncError, setMyUid]);

  const authReady =
    authMode === "admin-permanent"
      ? permanentAuthSessionId === session?.id
      : anonymousAuthReady;

  useSessionSync({ syncEnabled: authReady });

  const uid =
    authMode === "admin-permanent"
      ? authReady
        ? myUid
        : null
      : authMode === "hider-anonymous"
        ? authReady
          ? authUid
          : null
        : authReady
          ? authUid ?? myUid
          : null;

  const isHost = Boolean(
    session?.hostUid && uid && session.hostUid === uid,
  );

  useSessionEndedRedirect(sessionId, isHost, exitPath);
  const {
    canControlTimer,
    remoteState,
    remoteSnapshot,
    timerSyncing,
    onControl: onTimerControl,
    isRemote,
  } = useRemoteSessionTimerSync(sessionId, isHost);

  const timer = useSessionTimer(sessionId, {
    canControl: canControlTimer,
    onControl: onTimerControl,
    remoteState,
    remoteSnapshot,
    sessionResetAt: session?.sessionResetAt,
  });

  useSeekingStartedActivity({
    sessionId,
    canEmit: canControlTimer,
    sessionRules: session ?? DEFAULT_SESSION_RULES,
    timerState: timer.timerState,
  });

  const pendingQuestions = usePendingQuestionsSync(sessionId);
  const hidingZones = useHidingZonesSync(sessionId);
  const seekerLocations = useSeekerLocationsSync(sessionId, authReady);
  const showHiderLocations =
    notificationRole === "hider" ||
    notificationRole === "observer" ||
    notificationRole === "admin";
  const hiderLocations = useHiderLocationsSync(
    sessionId,
    showHiderLocations && authReady,
  );
  const chatMessages = useSessionMessagesSync(sessionId);
  const syncStatus = useSyncStatus();

  const { hasUnreadChat, unreadCount, acknowledgeFingerprints } = useChatUnread({
    sessionId,
    viewerUid: uid ?? undefined,
    messages: chatMessages,
    isChatOpen,
  });

  return {
    session,
    sessionId,
    uid,
    isHost,
    authReady,
    isRemote,
    canControlTimer,
    remoteState,
    remoteSnapshot,
    timerSyncing,
    onTimerControl,
    timer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    hiderLocations,
    chatMessages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    acknowledgeFingerprints,
  };
}
