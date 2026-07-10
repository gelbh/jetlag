import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { subscribeToTimeTraps } from "../../services/firestore/firestoreSessionExtras";
import { useSessionStore } from "../../state/sessionStore";

function isRemoteSession(sessionId: string | undefined): sessionId is string {
  return (
    Boolean(sessionId) &&
    isFirebaseConfigured() &&
    sessionId !== LOCAL_SESSION_ID
  );
}

export function useTimeTrapsSync(sessionId: string | undefined) {
  const [traps, setTraps] = useState<TimeTrapRecord[]>([]);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribeToTimeTraps(
      sessionId,
      setTraps,
      (error) => {
        setLastSyncError(
          error instanceof Error
            ? error.message
            : "Time trap sync failed.",
        );
      },
    );

    return () => {
      unsubscribe();
      setTraps([]);
    };
  }, [sessionId, setLastSyncError]);

  return traps;
}
