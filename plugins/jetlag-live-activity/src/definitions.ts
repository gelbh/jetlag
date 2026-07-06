export type LiveActivityKind = "question" | "session_timer";

export interface QuestionActivityInput {
  sessionId: string;
  toolLabel: string;
  deadlineAt: string;
  status?: string;
}

export interface QuestionActivityUpdate {
  remainingMs: number;
  status: string;
}

export interface SessionTimerActivityInput {
  sessionId: string;
  phaseLabel: string;
  displayTime: string;
  running: boolean;
}

export interface SessionTimerActivityUpdate {
  phaseLabel: string;
  displayTime: string;
  running: boolean;
}

export interface OngoingNotificationInput {
  id: number;
  title: string;
  body: string;
  ongoing?: boolean;
}

export interface JetlagLiveActivityPlugin {
  startQuestionActivity(input: QuestionActivityInput): Promise<void>;
  updateQuestionActivity(input: QuestionActivityUpdate): Promise<void>;
  endQuestionActivity(): Promise<void>;
  startSessionTimerActivity(input: SessionTimerActivityInput): Promise<void>;
  updateSessionTimerActivity(input: SessionTimerActivityUpdate): Promise<void>;
  endSessionTimerActivity(): Promise<void>;
  showOngoingNotification(input: OngoingNotificationInput): Promise<void>;
  dismissOngoingNotification(input: { id: number }): Promise<void>;
  addListener(
    eventName: "activityPushToken",
    listenerFunc: (event: { token: string }) => void,
  ): Promise<{ remove: () => void }>;
}
