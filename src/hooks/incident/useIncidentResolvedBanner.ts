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

function pickLatestNotice(notices: IncidentNotice[]): IncidentNotice | null {
  if (notices.length === 0) {
    return null;
  }
  return [...notices].sort((a, b) =>
    b.resolvedAt.localeCompare(a.resolvedAt),
  )[0];
}

export function useIncidentResolvedBanner(): {
  notice: IncidentNotice | null;
  dismiss: (incidentId: string) => Promise<void>;
} {
  const [uid, setUid] = useState<string | null>(() =>
    isFirebaseConfigured() ? (getFirebaseAuth().currentUser?.uid ?? null) : null,
  );
  const [notice, setNotice] = useState<IncidentNotice | null>(null);
  const preferences = useMapStore((state) => state.notificationPreferences);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUid(null);
      return;
    }

    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      setUid(user?.uid ?? null);
    });
  }, []);

  useEffect(() => {
    if (!uid || !preferences.enabled) {
      return;
    }

    void syncUserDeviceRegistration({ uid, preferences }).catch(() => {
      // Soft-fail: out-of-session FCM registration must not break Home.
    });
  }, [preferences, uid]);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) {
      setNotice(null);
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
      await dismissIncidentNotice(uid, incidentId);
    },
    [uid],
  );

  return { notice, dismiss };
}
