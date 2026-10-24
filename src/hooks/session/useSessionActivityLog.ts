import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import {
  type SessionActivityEvent,
  sortActivityEventsDesc,
} from "../../domain/session/activity/sessionActivityLog";
import { isFirebaseConfigured } from "../../services/core/firebase/firebase";
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

export function useSessionActivityLog(sessionId: string | undefined): SessionActivityEvent[] {
  const localEvents = useActivityLogStore((state) =>
    sessionId ? (state.eventsBySessionId[sessionId] ?? EMPTY_EVENTS) : EMPTY_EVENTS,
  );
  const [remoteEvents, setRemoteEvents] = useState<SessionActivityEvent[]>(EMPTY_EVENTS);

  useEffect(() => {
    if (!sessionId || sessionId === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setRemoteEvents(EMPTY_EVENTS);
      return;
    }

    return subscribeActivityLog(sessionId, setRemoteEvents, () => {});
  }, [sessionId]);

  return mergeActivityEvents(remoteEvents, localEvents);
}
