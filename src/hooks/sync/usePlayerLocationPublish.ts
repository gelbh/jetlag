import { useEffect, useRef } from "react";
import { isEffectivelyOffline } from "@/domain/device/sync/sync";
import { shouldPublishLocationNow } from "@/domain/game/locationPublishPolicy";
import { LOCAL_SESSION_ID } from "@/domain/map/annotations";
import type {
  PlayerLocationRecord,
  PlayerLocationRole,
} from "@/domain/session/activity/sessionChat";
import { captureException } from "@/services/core/analytics/clientErrors";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";
import type { GeolocationReading } from "@/services/core/location/geolocation";
import { isFirestorePermissionDenied } from "@/services/firestore/firestoreAnnotations";
import { writePlayerLocation } from "@/services/firestore/firestoreSessionExtras";
import { arePlayerLocationPublishesBlocked } from "@/services/session/playerLocationPublishGate";
import { useSessionStore } from "@/state/sessionStore";
import { maybeAppendPlayerTrailPoint } from "./appendPlayerTrailPoint";

interface UsePlayerLocationPublishParams {
  sessionId: string | undefined;
  uid: string | null;
  enabled: boolean;
  role: PlayerLocationRole;
  reading: GeolocationReading | null;
}

function isLocationPublishOffline(): boolean {
  return isEffectivelyOffline({
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    reachable: useSessionStore.getState().networkReachable,
  });
}

// Permission-denied is expected after leaving/being removed from a session.
function reportPublishError(error: unknown): void {
  if (!isFirestorePermissionDenied(error)) {
    captureException(error);
  }
}

/** Per publish target (session/uid); replaced on target change and unmount. */
interface PublishState {
  /** Token of the newest issued location write still awaiting its ack. */
  inFlight: number | null;
  /** Newest reading held back while offline with a write in flight. */
  pending: PlayerLocationRecord | null;
}

function createPublishState(): PublishState {
  return { inFlight: null, pending: null };
}

let nextWriteToken = 0;

/**
 * Publishes live location readings, latest-only while effectively offline so
 * the persisted Firestore queue gains at most one location write per player
 * once offline. Trail sampling runs on every reading, independent of location
 * coalescing.
 */
export function usePlayerLocationPublish({
  sessionId,
  uid,
  enabled,
  role,
  reading,
}: UsePlayerLocationPublishParams): void {
  const stateRef = useRef<PublishState>(createPublishState());

  // Cleanup (target change or unmount) detaches in-flight acks so a held
  // reading can never flush into a session the player has left.
  useEffect(
    () => () => {
      stateRef.current = createPublishState();
    },
    [enabled, sessionId, uid],
  );

  useEffect(() => {
    if (
      !enabled ||
      !reading ||
      !sessionId ||
      !uid ||
      !isFirebaseConfigured() ||
      sessionId === LOCAL_SESSION_ID ||
      arePlayerLocationPublishesBlocked()
    ) {
      return;
    }

    const state = stateRef.current;
    const isCurrent = () => stateRef.current === state;

    const publish = (next: PlayerLocationRecord) => {
      if (arePlayerLocationPublishesBlocked()) {
        state.pending = null;
        return;
      }
      if (
        !shouldPublishLocationNow({
          effectivelyOffline: isLocationPublishOffline(),
          hasUnackedLocationWrite: state.inFlight !== null,
        })
      ) {
        state.pending = next;
        return;
      }

      const token = ++nextWriteToken;
      state.pending = null;
      state.inFlight = token;

      const settle = (flushPending: boolean) => {
        if (!isCurrent() || state.inFlight !== token) {
          return;
        }
        state.inFlight = null;
        const pending = state.pending;
        state.pending = null;
        if (flushPending && pending) {
          publish(pending);
        }
      };

      writePlayerLocation(next.sessionId, next).then(
        () => settle(true),
        (error: unknown) => {
          // A denied write means the held reading would be denied too.
          settle(!isFirestorePermissionDenied(error));
          reportPublishError(error);
        },
      );
    };

    const accuracyMeters = reading.accuracy ?? undefined;
    publish({
      uid,
      sessionId,
      lat: reading.lat,
      lng: reading.lng,
      accuracyMeters,
      updatedAt: new Date().toISOString(),
      role,
    });

    maybeAppendPlayerTrailPoint({
      sessionId,
      uid,
      role,
      reading: { lat: reading.lat, lng: reading.lng, accuracyMeters },
    }).catch(reportPublishError);
  }, [enabled, reading, role, sessionId, uid]);
}
