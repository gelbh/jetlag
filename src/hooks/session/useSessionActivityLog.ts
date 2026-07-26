import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import {
  sortActivityEventsDesc,
  type SessionActivityEvent,
} from "../../domain/session/sessionActivityLog";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { subscribeActivityLog } from "../../services/firestore/firestoreActivityLog";
import { useActivityLogStore } from "../../state/activityLogStore";

const EMPTY_EVENTS: SessionActivityEvent[] = [];

function mergeActivityEvents(
  remote: readonly SessionActivityEvent[],
  local: readonly SessionActivityEvent[],
): SessionActivityEvent[] {
  const byId = new Map<string, SessionActivityEvent>();
  for (const event of local) {
    byId.set(event.id, event);
  }
  for (const event of remote) {
    byId.set(event.id, event);
  }
  return sortActivityEventsDesc([...byId.values()]);
}

/**
 * Subscribes to the session activity timeline (Firestore + local store merge),
 * sorted newest-first by `createdAt`.
 */
export function useSessionActivityLog(
  sessionId: string | undefined,
): SessionActivityEvent[] {
  const localEvents = useActivityLogStore((state) =>
    sessionId ? (state.eventsBySessionId[sessionId] ?? EMPTY_EVENTS) : EMPTY_EVENTS,
  );
  const [remoteEvents, setRemoteEvents] =
    useState<SessionActivityEvent[]>(EMPTY_EVENTS);

  useEffect(() => {
    if (
      !sessionId ||
      sessionId === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear remote when leaving remote session */
      setRemoteEvents(EMPTY_EVENTS);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    return subscribeActivityLog(
      sessionId,
      setRemoteEvents,
      () => {
        // Keep last good remote snapshot on permission/network errors.
      },
    );
  }, [sessionId]);

  return mergeActivityEvents(remoteEvents, localEvents);
}
