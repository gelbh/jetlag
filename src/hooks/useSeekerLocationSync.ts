import { useEffect } from "react";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import type { PlayerLocationRecord } from "../domain/sessionChat";
import { useLiveLocation } from "./useLiveLocation";
import { isFirebaseConfigured } from "../services/firebase";
import { writePlayerLocation } from "../services/firestoreSessionExtras";

interface UseSeekerLocationSyncParams {
  sessionId: string | undefined;
  uid: string | null;
  enabled: boolean;
}

export function useSeekerLocationSync({
  sessionId,
  uid,
  enabled,
}: UseSeekerLocationSyncParams) {
  const { reading, error } = useLiveLocation(enabled, {
    highAccuracy: true,
    minIntervalMs: 2000,
    minDistanceMeters: 8,
  });

  useEffect(() => {
    if (
      !enabled ||
      !reading ||
      !sessionId ||
      !uid ||
      !isFirebaseConfigured() ||
      sessionId === LOCAL_SESSION_ID
    ) {
      return;
    }

    const location: PlayerLocationRecord = {
      uid,
      sessionId,
      lat: reading.lat,
      lng: reading.lng,
      accuracyMeters: reading.accuracy ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    void writePlayerLocation(sessionId, location);
  }, [enabled, reading, sessionId, uid]);

  return { error };
}
