import type { PlayerRole } from "../session/playerRole";

export type NotificationPlatform = "ios" | "android" | "web";

export interface NotificationPreferences {
  enabled: boolean;
  newQuestions: boolean;
  timerChanges: boolean;
  chatMessages: boolean;
  /** Host-only: destructive session-ops agent actions awaiting confirm. */
  incidentHostConfirm: boolean;
  liveActivities: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  newQuestions: true,
  timerChanges: true,
  chatMessages: false,
  incidentHostConfirm: true,
  liveActivities: true,
};

export interface SessionDeviceRecord {
  token: string;
  platform: NotificationPlatform;
  role: PlayerRole;
  updatedAt: string;
  preferences: NotificationPreferences;
  activityPushToken?: string;
}

export type SessionNotificationEvent =
  | "new_question"
  | "question_answered"
  | "question_deadline_expired"
  | "timer_changed"
  | "chat_message"
  | "incident_host_confirm";
