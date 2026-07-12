import { useEffect, useRef } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { writeHidingZone } from "../../services/firestore/firestoreSessionExtras";

export function useHidingZoneUidHeal(
  sessionId: string | undefined,
  uid: string | null,
  hidingZones: readonly HidingZoneRecord[],
  persistedUid: string | null,
): void {
  const healedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      !sessionId ||
      !uid ||
      !persistedUid ||
      uid === persistedUid ||
      sessionId === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const healKey = `${sessionId}:${persistedUid}->${uid}`;
    if (healedKeysRef.current.has(healKey)) {
      return;
    }

    const staleZone = hidingZones.find(
      (zone) => zone.hiderUid === persistedUid && zone.status === "confirmed",
    );
    const hasCurrentZone = hidingZones.some((zone) => zone.hiderUid === uid);

    if (!staleZone || hasCurrentZone) {
      return;
    }

    healedKeysRef.current.add(healKey);
    void writeHidingZone(sessionId, {
      ...staleZone,
      hiderUid: uid,
    });
  }, [hidingZones, persistedUid, sessionId, uid]);
}
