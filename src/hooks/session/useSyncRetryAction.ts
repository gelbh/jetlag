import { useCallback } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { flushOfflineQueue } from "../../services/session/flushOfflineQueue";
import { useSessionStore } from "../../state/sessionStore";

export function useSyncRetryAction(): (() => void) | undefined {
  const session = useSessionStore((state) => state.session);
  const setPendingWrites = useSessionStore((state) => state.setPendingWrites);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);

  return useCallback(() => {
    if (!session || session.id === LOCAL_SESSION_ID) {
      return;
    }

    void flushOfflineQueue(session.id).then(({ remaining, lastError }) => {
      setPendingWrites(remaining);
      setLastSyncError(lastError);
    });
  }, [session, setLastSyncError, setPendingWrites]);
}
