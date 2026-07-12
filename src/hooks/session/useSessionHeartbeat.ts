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

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      session.status === "ended" ||
      typeof session.endedAt === "string"
    ) {
      return;
    }

    const sessionId = session.id;

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

    void maybeTouch(true);
    const intervalId = window.setInterval(() => {
      void maybeTouch(false);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session]);
}
