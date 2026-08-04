import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import {
  computeElapsedMs,
  formatElapsedTime,
  type TimerState,
} from "@/domain/session/timer/timer";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "@/domain/session/hiding/hidingPeriod";
import { selectPrimaryQuestionTimer } from "@/domain/questions";

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

  const elapsed = computeElapsedMs(timerState);
  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, sessionRules);

  if (questionTimer) {
    return {
      phase: questionTimer.toolLabel,
      value: questionTimer.countdownLabel,
    };
  }

  if (isHidingPeriodActive(sessionRules, elapsed)) {
    const hidingLabel = formatHidingPeriodCountdown(
      hidingPeriodRemainingMs(sessionRules, elapsed),
    );
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
