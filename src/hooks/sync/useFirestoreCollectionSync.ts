import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase";

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
): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribe(
      sessionId,
      setItems,
      () => setItems([]),
    );

    return () => {
      unsubscribe();
      setItems([]);
    };
  }, [sessionId, subscribe]);

  return items;
}
