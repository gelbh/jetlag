import { selectPrimaryQuestionTimer } from "@/domain/questions";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "@/domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "@/domain/session/rules";
import { computeElapsedMs, formatElapsedTime, type TimerState } from "@/domain/session/timer/timer";
import { serverNow } from "@/services/core/time/serverClock";

export type LandscapeChipTimerLabel = {
  phase: string;
  value: string;
};

export function mapLandscapeChipTimerLabel({
  sessionRules,
  timerState,
  timerHasStarted,
  pendingQuestions = [],
}: {
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
}): LandscapeChipTimerLabel {
  if (!timerHasStarted) {
    return { phase: "SESSION", value: "Ready" };
  }

  const elapsed = computeElapsedMs(timerState, serverNow());
  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, sessionRules, serverNow());

  if (questionTimer) {
    return {
      phase: questionTimer.toolLabel,
      value: questionTimer.countdownLabel,
    };
  }

  if (isHidingPeriodActive(sessionRules, elapsed)) {
    const hidingLabel = formatHidingPeriodCountdown(hidingPeriodRemainingMs(sessionRules, elapsed));
    return {
      phase: "HIDE",
      value: hidingLabel || formatElapsedTime(elapsed),
    };
  }

  return {
    phase: "SEEK",
    value: formatElapsedTime(seekPhaseElapsedMs(sessionRules, elapsed)),
  };
}
