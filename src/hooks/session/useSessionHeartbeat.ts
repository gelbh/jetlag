import { useEffect, useRef } from "react";
import {
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/map/annotations";
import { touchSessionLastActive } from "../../services/firestore/firestoreAnnotations";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const CLIENT_TOUCH_THROTTLE_MS = 4 * 60 * 1000;

export function useSessionHeartbeat(session: SessionRecord | null) {
  const lastTouchAtRef = useRef<number>(0);
  const initialTouchSessionIdRef = useRef<string | null>(null);

  const sessionId = session?.id;
  const sessionStatus = session?.status;
  const sessionEndedAt = session?.endedAt;

  useEffect(() => {
    if (
      !sessionId ||
      sessionId === LOCAL_SESSION_ID ||
      sessionStatus === "ended" ||
      typeof sessionEndedAt === "string"
    ) {
      return;
    }

    const maybeTouch = async (force = false) => {
      const now = Date.now();
      if (
        !force &&
        now - lastTouchAtRef.current < CLIENT_TOUCH_THROTTLE_MS
      ) {
        return;
      }

      try {
        await touchSessionLastActive(sessionId);
        lastTouchAtRef.current = now;
      } catch {
        // Heartbeat failures are non-fatal; cron handles stale sessions server-side.
      }
    };

    const forceInitial = initialTouchSessionIdRef.current !== sessionId;
    if (forceInitial) {
      initialTouchSessionIdRef.current = sessionId;
    }

    void maybeTouch(forceInitial);
    const intervalId = window.setInterval(() => {
      void maybeTouch(false);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessionId, sessionStatus, sessionEndedAt]);
}
