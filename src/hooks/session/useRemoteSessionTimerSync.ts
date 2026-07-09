import { useCallback, useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { timerStateFromRemote, type TimerState } from "../../domain/session/timer";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  isFirestorePermissionDenied,
  subscribeToSession,
  updateSessionTimer,
} from "../../services/firestore/firestoreAnnotations";

interface RemoteTimerSnapshot {
  sessionId: string;
  state: TimerState;
}

export function useRemoteSessionTimerSync(
  sessionId: string | undefined,
  isHost: boolean,
) {
  const isRemote = Boolean(
    sessionId && sessionId !== LOCAL_SESSION_ID && isFirebaseConfigured(),
  );
  const [snapshot, setSnapshot] = useState<RemoteTimerSnapshot | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!isRemote || !sessionId) {
      return;
    }

    return subscribeToSession(
      sessionId,
      (session) => {
        setSnapshot({
          sessionId,
          state: timerStateFromRemote(
            session.timerAccumulatedMs,
            session.timerRunningSince,
          ),
        });
      },
      () => {
        // Session sync errors are surfaced elsewhere on the map screen.
      },
    );
  }, [isRemote, sessionId]);

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
    snapshot && snapshot.sessionId === sessionId ? snapshot.state : undefined;

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
