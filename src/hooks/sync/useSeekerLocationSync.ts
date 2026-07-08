import { useEffect } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { getPowerProfile } from "../../domain/device/powerProfile";
import type { PlayerLocationRecord } from "../../domain/session/sessionChat";
import { useMapStore } from "../../state/mapStore";
import { useLiveLocation } from "../location/useLiveLocation";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { isFirestorePermissionDenied } from "../../services/firestore/firestoreAnnotations";
import { writePlayerLocation } from "../../services/firestore/firestoreSessionExtras";

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
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const profile = getPowerProfile(lowPowerMode).seekerLocationSync;
  const { reading, error } = useLiveLocation(enabled, profile);

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

    void writePlayerLocation(sessionId, location).catch((error: unknown) => {
      if (!isFirestorePermissionDenied(error)) {
        throw error;
      }
    });
  }, [enabled, reading, sessionId, uid]);

  return { error };
}
