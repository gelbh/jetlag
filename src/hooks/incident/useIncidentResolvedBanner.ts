import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  dismissIncidentNotice,
  listenUndismissedIncidentNotices,
  type IncidentNotice,
} from "../../services/firestore/firestoreIncidentNotices";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import { syncUserDeviceRegistration } from "../../services/core/native/notifications";
import { useMapStore } from "../../state/mapStore";

export function pickLatestNotice(
  notices: IncidentNotice[]
): IncidentNotice | null {
  let latest: IncidentNotice | null = null;
  for (const notice of notices) {
    if (!latest || notice.resolvedAt.localeCompare(latest.resolvedAt) > 0) {
      latest = notice;
    }
  }
  return latest;
}

export function useIncidentResolvedBanner(): {
  notice: IncidentNotice | null;
  dismiss: (incidentId: string) => Promise<void>;
} {
  const [uid, setUid] = useState<string | null>(() =>
    isFirebaseConfigured() ? getFirebaseAuth().currentUser?.uid ?? null : null
  );
  const [notice, setNotice] = useState<IncidentNotice | null>(null);
  const preferences = useMapStore((state) => state.notificationPreferences);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      const nextUid = user?.uid ?? null;
      setUid(nextUid);
      if (!nextUid) {
        setNotice(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!uid) {
      return;
    }

    void syncUserDeviceRegistration({ uid, preferences }).catch(() => {
      // Soft-fail: out-of-session FCM registration must not break Home.
    });
  }, [preferences, uid]);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) {
      return;
    }

    return listenUndismissedIncidentNotices(uid, (notices) => {
      setNotice(pickLatestNotice(notices));
    });
  }, [uid]);

  const dismiss = useCallback(
    async (incidentId: string) => {
      if (!uid) {
        return;
      }
      try {
        await dismissIncidentNotice(uid, incidentId);
      } catch {
        // Soft-fail: dismiss write must not surface as an unhandled rejection.
      }
    },
    [uid]
  );

  return { notice, dismiss };
}
