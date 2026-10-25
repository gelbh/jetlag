import { useEffect, useRef, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";

function isRemoteSession(sessionId: string | undefined): sessionId is string {
  return Boolean(sessionId) && isFirebaseConfigured() && sessionId !== LOCAL_SESSION_ID;
}

type CollectionSubscriber<T> = (
  sessionId: string,
  onData: (items: T[]) => void,
  onError: () => void,
) => () => void;

interface LoadedFor<T> {
  sessionId: string;
  subscribe: CollectionSubscriber<T>;
}

export function useFirestoreCollectionSyncWithStatus<T>(
  sessionId: string | undefined,
  subscribe: CollectionSubscriber<T>,
  { enabled = true, onSyncError }: { enabled?: boolean; onSyncError?: () => void } = {},
): { items: T[]; loaded: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loadedFor, setLoadedFor] = useState<LoadedFor<T> | null>(null);
  const onSyncErrorRef = useRef(onSyncError);

  useEffect(() => {
    onSyncErrorRef.current = onSyncError;
  }, [onSyncError]);

  useEffect(() => {
    if (!enabled || !isRemoteSession(sessionId)) {
      return;
    }

    const markLoaded = () => {
      setLoadedFor({ sessionId, subscribe });
    };

    const unsubscribe = subscribe(
      sessionId,
      (nextItems) => {
        setItems(nextItems);
        markLoaded();
      },
      () => {
        const handler = onSyncErrorRef.current;
        if (handler) {
          handler();
        } else {
          setItems([]);
        }
        markLoaded();
      },
    );

    return () => {
      unsubscribe();
      setLoadedFor(null);
      queueMicrotask(() => {
        setItems([]);
      });
    };
  }, [enabled, sessionId, subscribe]);

  // Disabled gates must not report vacuous loaded=true (hider truthReferenceReady).
  const loaded = !enabled
    ? false
    : !isRemoteSession(sessionId) ||
      (loadedFor?.sessionId === sessionId && loadedFor.subscribe === subscribe);

  return { items, loaded };
}

export function useFirestoreCollectionSync<T>(
  sessionId: string | undefined,
  subscribe: CollectionSubscriber<T>,
  options: { enabled?: boolean; onSyncError?: () => void } = {},
): T[] {
  return useFirestoreCollectionSyncWithStatus(sessionId, subscribe, options).items;
}
