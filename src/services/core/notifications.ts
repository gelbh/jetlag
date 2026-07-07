import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import type { JetlagLiveActivityPlugin } from "../../../plugins/jetlag-live-activity/src/definitions";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPlatform,
  type NotificationPreferences,
} from "../../domain/device/notifications";
import type { PlayerRole } from "../../domain/session/playerRole";
import { upsertSessionDevice } from "../firestore/firestoreDevices";

export const JetlagLiveActivity = registerPlugin<JetlagLiveActivityPlugin>(
  "JetlagLiveActivity",
);

let pushRegistrationStarted = false;
let currentPushToken: string | null = null;
let activityPushToken: string | null = null;

function resolvePlatform(): NotificationPlatform {
  const platform = Capacitor.getPlatform();
  if (platform === "ios" || platform === "android") {
    return platform;
  }

  return "web";
}

export function isNativeNotificationsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export function getCurrentPushToken(): string | null {
  return currentPushToken;
}

export function getActivityPushToken(): string | null {
  return activityPushToken;
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }

  await LocalNotifications.createChannel({
    id: "jetlag_alerts",
    name: "Jet Lag alerts",
    description: "Session questions, timers, and chat",
    importance: 4,
    visibility: 1,
  });
}

export async function initializeNativeNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform() || pushRegistrationStarted) {
    return;
  }

  pushRegistrationStarted = true;
  await ensureAndroidNotificationChannel();

  await PushNotifications.addListener("registration", (token: Token) => {
    currentPushToken = token.value;
  });

  await PushNotifications.addListener("registrationError", () => {
    currentPushToken = null;
  });

  await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification: PushNotificationSchema) => {
      if (Capacitor.getPlatform() === "android" && notification.title) {
        void LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 1_000_000,
              title: notification.title,
              body: notification.body ?? "",
              channelId: "jetlag_alerts",
            },
          ],
        });
      }
    },
  );

  await JetlagLiveActivity.addListener("activityPushToken", (event) => {
    activityPushToken = event.token;
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  await initializeNativeNotifications();

  const pushStatus = await PushNotifications.requestPermissions();
  const localStatus = await LocalNotifications.requestPermissions();

  const granted =
    pushStatus.receive === "granted" || localStatus.display === "granted";

  if (granted) {
    await PushNotifications.register();
  }

  return granted;
}

export async function syncSessionDeviceRegistration(input: {
  sessionId: string;
  uid: string;
  role: PlayerRole;
  preferences: NotificationPreferences;
}): Promise<void> {
  if (!Capacitor.isNativePlatform() || !input.preferences.enabled) {
    return;
  }

  await initializeNativeNotifications();

  if (!currentPushToken) {
    await PushNotifications.register();
    await waitForPushToken(4_000);
  }

  if (!currentPushToken) {
    return;
  }

  await upsertSessionDevice(input.sessionId, input.uid, {
    token: currentPushToken,
    platform: resolvePlatform(),
    role: input.role,
    preferences: input.preferences,
    activityPushToken: activityPushToken ?? undefined,
  });
}

async function waitForPushToken(timeoutMs: number): Promise<void> {
  const started = Date.now();

  while (!currentPushToken && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function mergeNotificationPreferences(
  partial: Partial<NotificationPreferences> | undefined,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...partial,
  };
}

export async function refreshActivityPushToken(input: {
  sessionId: string;
  uid: string;
  role: PlayerRole;
  preferences: NotificationPreferences;
}): Promise<void> {
  if (!activityPushToken || !currentPushToken) {
    return;
  }

  await upsertSessionDevice(input.sessionId, input.uid, {
    token: currentPushToken,
    platform: resolvePlatform(),
    role: input.role,
    preferences: input.preferences,
    activityPushToken,
  });
}
