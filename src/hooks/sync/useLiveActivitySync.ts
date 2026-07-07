import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "../../domain/session/hidingPeriod";
import type { NotificationPreferences } from "../../domain/device/notifications";
import { selectPrimaryQuestionTimer } from "../../domain/questions/questionTimerDisplay";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "../../domain/session/timer";
import { JetlagLiveActivity } from "../../services/core/notifications";

const ANDROID_QUESTION_NOTIFICATION_ID = 1001;
const ANDROID_TIMER_NOTIFICATION_ID = 1002;

interface UseLiveActivitySyncParams {
  enabled: boolean;
  sessionId: string | undefined;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
  pendingQuestions: readonly PendingQuestionRecord[];
  preferences: NotificationPreferences;
}

function formatQuestionBody(countdownLabel: string, toolLabel: string): string {
  if (countdownLabel === "WALKING") {
    return `${toolLabel} · walking in progress`;
  }

  return `${toolLabel} · ${countdownLabel} to answer`;
}

export function useLiveActivitySync({
  enabled,
  sessionId,
  sessionRules,
  timerState,
  timerHasStarted,
  pendingQuestions,
  preferences,
}: UseLiveActivitySyncParams) {
  const questionActiveRef = useRef(false);
  const timerActiveRef = useRef(false);
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (
      !enabled ||
      !sessionId ||
      !preferences.enabled ||
      !preferences.liveActivities ||
      !Capacitor.isNativePlatform()
    ) {
      return;
    }

    const sync = () => {
      const questionTimer = selectPrimaryQuestionTimer(
        pendingQuestions,
        sessionRules,
      );

      if (questionTimer) {
        const body = formatQuestionBody(
          questionTimer.countdownLabel,
          questionTimer.toolLabel,
        );

        if (platform === "ios") {
          if (!questionActiveRef.current) {
            questionActiveRef.current = true;
            void JetlagLiveActivity.startQuestionActivity({
              sessionId,
              toolLabel: questionTimer.toolLabel,
              deadlineAt: new Date(
                Date.now() + questionTimer.remainingMs,
              ).toISOString(),
              status:
                questionTimer.countdownLabel === "WALKING"
                  ? "walking"
                  : "pending",
            });
          } else {
            void JetlagLiveActivity.updateQuestionActivity({
              remainingMs: Math.max(0, questionTimer.remainingMs),
              status:
                questionTimer.countdownLabel === "WALKING"
                  ? "walking"
                  : "pending",
            });
          }
        } else if (platform === "android") {
          void JetlagLiveActivity.showOngoingNotification({
            id: ANDROID_QUESTION_NOTIFICATION_ID,
            title: "Question active",
            body,
            ongoing: true,
          });
        }
      } else if (questionActiveRef.current) {
        questionActiveRef.current = false;
        if (platform === "ios") {
          void JetlagLiveActivity.endQuestionActivity();
        } else if (platform === "android") {
          void JetlagLiveActivity.dismissOngoingNotification({
            id: ANDROID_QUESTION_NOTIFICATION_ID,
          });
        }
      } else if (platform === "android") {
        void JetlagLiveActivity.dismissOngoingNotification({
          id: ANDROID_QUESTION_NOTIFICATION_ID,
        });
      }

      if (timerHasStarted) {
        const elapsed = computeElapsedMs(timerState);
        const hidingActive = isHidingPeriodActive(sessionRules, elapsed);
        const hidingRemaining = hidingPeriodRemainingMs(sessionRules, elapsed);
        const phaseLabel = hidingActive ? "Hiding period" : "Seek phase";
        const displayTime = hidingActive
          ? formatHidingPeriodCountdown(hidingRemaining).replace(/^HIDING\s/, "")
          : formatElapsedTime(seekPhaseElapsedMs(sessionRules, elapsed));
        const running = isTimerRunning(timerState);

        if (platform === "ios") {
          if (!timerActiveRef.current) {
            timerActiveRef.current = true;
            void JetlagLiveActivity.startSessionTimerActivity({
              sessionId,
              phaseLabel,
              displayTime,
              running,
            });
          } else {
            void JetlagLiveActivity.updateSessionTimerActivity({
              phaseLabel,
              displayTime,
              running,
            });
          }
        } else if (platform === "android") {
          void JetlagLiveActivity.showOngoingNotification({
            id: ANDROID_TIMER_NOTIFICATION_ID,
            title: phaseLabel,
            body: `${displayTime}${running ? "" : " · paused"}`,
            ongoing: true,
          });
        }
      } else if (timerActiveRef.current) {
        timerActiveRef.current = false;
        if (platform === "ios") {
          void JetlagLiveActivity.endSessionTimerActivity();
        } else if (platform === "android") {
          void JetlagLiveActivity.dismissOngoingNotification({
            id: ANDROID_TIMER_NOTIFICATION_ID,
          });
        }
      } else if (platform === "android") {
        void JetlagLiveActivity.dismissOngoingNotification({
          id: ANDROID_TIMER_NOTIFICATION_ID,
        });
      }
    };

    sync();
    const interval = window.setInterval(sync, 1_000);

    return () => {
      window.clearInterval(interval);
      if (questionActiveRef.current) {
        questionActiveRef.current = false;
        if (platform === "ios") {
          void JetlagLiveActivity.endQuestionActivity();
        } else if (platform === "android") {
          void JetlagLiveActivity.dismissOngoingNotification({
            id: ANDROID_QUESTION_NOTIFICATION_ID,
          });
        }
      }
      if (timerActiveRef.current) {
        timerActiveRef.current = false;
        if (platform === "ios") {
          void JetlagLiveActivity.endSessionTimerActivity();
        } else if (platform === "android") {
          void JetlagLiveActivity.dismissOngoingNotification({
            id: ANDROID_TIMER_NOTIFICATION_ID,
          });
        }
      }
    };
  }, [
    enabled,
    sessionRules,
    pendingQuestions,
    platform,
    preferences.enabled,
    preferences.liveActivities,
    sessionId,
    timerHasStarted,
    timerState,
  ]);
}
