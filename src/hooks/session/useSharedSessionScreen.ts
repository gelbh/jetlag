import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/playerRole";
import { DEFAULT_SESSION_RULES } from "../../domain/session/sessionRules";
import { useChatUnread } from "./useChatUnread";
import {
  useHidingZonesSync,
  useHiderLocationsSync,
  usePendingQuestionsSync,
  useSeekerLocationsSync,
  useSessionMessagesSync,
} from "./useSessionExtrasSync";
import { useRemoteSessionTimerSync } from "./useRemoteSessionTimerSync";
import { useSessionEndedRedirect } from "./useSessionEndedRedirect";
import { useSessionNotifications } from "./useSessionNotifications";
import { useSessionSync } from "./useSessionSync";
import { useSessionTimer } from "./useSessionTimer";
import { useLiveActivitySync } from "../sync/useLiveActivitySync";
import { useSyncStatus } from "../sync/useSyncStatus";
import { useFirebaseAuthReady } from "../sync/useFirebaseAuthReady";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import { setPremiumApiContext } from "../../services/core/premiumApiContext";
import { useSessionStore } from "../../state/sessionStore";

export type SessionAuthMode = "seeker-remote" | "hider-anonymous";

export interface UseSharedSessionScreenOptions {
  isChatOpen: boolean;
  notificationRole: PlayerRole;
  authMode: SessionAuthMode;
  liveActivityEnabled?: boolean;
  exitPath?: string;
}

export function useSharedSessionScreen({
  isChatOpen,
  notificationRole,
  authMode,
  liveActivityEnabled = true,
  exitPath = "/",
}: UseSharedSessionScreenOptions) {
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setMyUid = useSessionStore((state) => state.setMyUid);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const sessionId = session?.id;
  const authReady = useFirebaseAuthReady(session);
  const [authUid, setAuthUid] = useState<string | null>(null);

  useSessionSync();

  useEffect(() => {
    setPremiumApiContext(session);
  }, [session]);

  useEffect(() => {
    if (authMode === "seeker-remote") {
      if (
        !session ||
        session.id === LOCAL_SESSION_ID ||
        !isFirebaseConfigured()
      ) {
        return;
      }

      void (async () => {
        try {
          const user = await ensureAnonymousUser();
          setAuthUid(user.uid);
        } catch (error) {
          setLastSyncError(
            error instanceof Error
              ? error.message
              : "No access to this session.",
          );
        }
      })();
      return;
    }

    void ensureAnonymousUser().then((user) => {
      setAuthUid(user.uid);
      setMyUid(user.uid);
    });
  }, [authMode, session, session?.id, setLastSyncError, setMyUid]);

  const uid =
    authMode === "hider-anonymous"
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
  });

  const pendingQuestions = usePendingQuestionsSync(sessionId);
  const hidingZones = useHidingZonesSync(sessionId);
  const seekerLocations = useSeekerLocationsSync(sessionId);
  const hiderLocations = useHiderLocationsSync(sessionId);
  const chatMessages = useSessionMessagesSync(sessionId);
  const syncStatus = useSyncStatus();

  const { hasUnreadChat, unreadCount } = useChatUnread({
    sessionId,
    viewerUid: uid ?? undefined,
    messages: chatMessages,
    isChatOpen,
  });

  const {
    notificationPreferences: liveNotificationPreferences,
    enableNotifications,
    updateNotificationPreferences,
  } = useSessionNotifications({
    sessionId,
    uid: uid ?? undefined,
    role: notificationRole,
  });

  useLiveActivitySync({
    enabled: liveActivityEnabled && Boolean(sessionId),
    sessionId,
    sessionRules: session ?? DEFAULT_SESSION_RULES,
    timerState: timer.timerState,
    timerHasStarted: timer.hasStarted,
    pendingQuestions,
    preferences: liveNotificationPreferences,
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
    liveNotificationPreferences,
    enableNotifications,
    updateNotificationPreferences,
  };
}
