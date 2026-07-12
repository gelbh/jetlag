import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { useSessionStore } from "../../state/sessionStore";

function isRemoteSession(sessionId: string | undefined): sessionId is string {
  return (
    Boolean(sessionId) &&
    isFirebaseConfigured() &&
    sessionId !== LOCAL_SESSION_ID
  );
}

type CollectionSubscriber<T> = (
  sessionId: string,
  onData: (items: T[]) => void,
  onError: () => void,
) => () => void;

/**
 * Subscribes to a Firestore collection for the session. `subscribe` is an
 * effect dependency: pass a module-level (or memoized) subscriber, or the
 * subscription is torn down and recreated on every render.
 */
export function useFirestoreCollectionSync<T>(
  sessionId: string | undefined,
  subscribe: CollectionSubscriber<T>,
  { enabled = true }: { enabled?: boolean } = {},
): T[] {
  const [items, setItems] = useState<T[]>([]);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);

  useEffect(() => {
    if (!enabled || !isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribe(
      sessionId,
      setItems,
      () => setLastSyncError("Live location sync failed."),
    );

    return () => {
      unsubscribe();
      setItems([]);
    };
  }, [enabled, sessionId, setLastSyncError, subscribe]);

  return items;
}
