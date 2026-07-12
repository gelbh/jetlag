import { useCallback } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { timerStateFromRemote, type TimerState } from "../../domain/session/timer";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  isFirestorePermissionDenied,
  updateSessionTimer,
} from "../../services/firestore/firestoreAnnotations";
import { useSessionStore } from "../../state/sessionStore";

export function useRemoteSessionTimerSync(
  sessionId: string | undefined,
  isHost: boolean,
) {
  const session = useSessionStore((state) => state.session);
  const isRemote = Boolean(
    sessionId && sessionId !== LOCAL_SESSION_ID && isFirebaseConfigured(),
  );
  const sessionMatches = session?.id === sessionId;

  const onControl = useCallback(
    (state: TimerState) => {
      if (!isRemote || !isHost || !sessionId) {
        return;
      }

      void updateSessionTimer(sessionId, state).catch((error: unknown) => {
        if (!isFirestorePermissionDenied(error)) {
          throw error;
        }
      });
    },
    [isHost, isRemote, sessionId],
  );

  const remoteSnapshot =
    isRemote && sessionMatches && session
      ? timerStateFromRemote(
          session.timerAccumulatedMs,
          session.timerRunningSince,
        )
      : undefined;

  const remoteState =
    isRemote && !isHost ? remoteSnapshot : null;

  const timerSyncing = isRemote && !isHost && remoteSnapshot === undefined;

  return {
    isRemote,
    canControlTimer: !isRemote || isHost,
    remoteState,
    remoteSnapshot: isRemote ? remoteSnapshot : undefined,
    timerSyncing,
    onControl: isRemote && isHost ? onControl : undefined,
  };
}
