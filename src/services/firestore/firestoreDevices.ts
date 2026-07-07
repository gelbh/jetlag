import { doc, setDoc } from "firebase/firestore";
import type {
  NotificationPreferences,
  NotificationPlatform,
  SessionDeviceRecord,
} from "../domain/notifications";
import type { PlayerRole } from "../domain/playerRole";
import { getFirestoreDb } from "./firebase";

export async function upsertSessionDevice(
  sessionId: string,
  uid: string,
  input: {
    token: string;
    platform: NotificationPlatform;
    role: PlayerRole;
    preferences: NotificationPreferences;
    activityPushToken?: string;
  },
): Promise<void> {
  const record: SessionDeviceRecord = {
    token: input.token,
    platform: input.platform,
    role: input.role,
    updatedAt: new Date().toISOString(),
    preferences: input.preferences,
    ...(input.activityPushToken
      ? { activityPushToken: input.activityPushToken }
      : {}),
  };

  await setDoc(
    doc(getFirestoreDb(), "sessions", sessionId, "devices", uid),
    record,
    { merge: true },
  );
}
