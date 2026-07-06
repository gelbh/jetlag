import { useCallback, useEffect } from "react";
import type { NotificationPreferences } from "../domain/notifications";
import type { PlayerRole } from "../domain/playerRole";
import { useMapStore } from "../state/mapStore";
import {
  initializeNativeNotifications,
  isNativeNotificationsSupported,
  refreshActivityPushToken,
  requestNotificationPermission,
  syncSessionDeviceRegistration,
} from "../services/notifications";

interface UseSessionNotificationsParams {
  sessionId: string | undefined;
  uid: string | undefined;
  role: PlayerRole | undefined;
}

export function useSessionNotifications({
  sessionId,
  uid,
  role,
}: UseSessionNotificationsParams) {
  const notificationPreferences = useMapStore(
    (state) => state.notificationPreferences,
  );
  const setNotificationPreferences = useMapStore(
    (state) => state.setNotificationPreferences,
  );
  const nativeSupported = isNativeNotificationsSupported();

  useEffect(() => {
    void initializeNativeNotifications();
  }, []);

  useEffect(() => {
    if (
      !sessionId ||
      !uid ||
      !role ||
      !notificationPreferences.enabled ||
      !nativeSupported
    ) {
      return;
    }

    void syncSessionDeviceRegistration({
      sessionId,
      uid,
      role,
      preferences: notificationPreferences,
    });
  }, [nativeSupported, notificationPreferences, role, sessionId, uid]);

  useEffect(() => {
    if (
      !sessionId ||
      !uid ||
      !role ||
      !notificationPreferences.enabled ||
      !notificationPreferences.liveActivities
    ) {
      return;
    }

    void refreshActivityPushToken({
      sessionId,
      uid,
      role,
      preferences: notificationPreferences,
    });
  }, [
    notificationPreferences,
    notificationPreferences.enabled,
    notificationPreferences.liveActivities,
    role,
    sessionId,
    uid,
  ]);

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setNotificationPreferences({
      ...notificationPreferences,
      enabled: granted,
    });
    return granted;
  }, [notificationPreferences, setNotificationPreferences]);

  const updateNotificationPreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setNotificationPreferences({
        ...notificationPreferences,
        ...patch,
      });
    },
    [notificationPreferences, setNotificationPreferences],
  );

  return {
    nativeSupported,
    notificationPreferences,
    enableNotifications,
    updateNotificationPreferences,
  };
}
