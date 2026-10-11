import { Stack, Text } from "@mantine/core";
import { getPowerProfile } from "@/domain/device/power/powerProfile";
import { isStaleThermometerWalk, selectPrimaryQuestionTimer } from "@/domain/questions";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "@/domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "@/domain/session/rules";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "@/domain/session/timer/timer";
import { useStaleWalkNowMs } from "@/hooks/sync/useStaleWalkNowMs";
import { useServerNowMs } from "@/hooks/time/useServerNowMs";
import { useMapStore } from "@/state/mapStore";

export type MapTimerClusterProps = {
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  myUid?: string | null;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
};

const primaryStyle = {
  letterSpacing: "-0.01em",
  lineHeight: 1.15,
  color: "var(--color-field-ink)",
  fontVariantNumeric: "tabular-nums" as const,
  fontSize: "0.9375rem",
  fontWeight: 700,
};

const secondaryStyle = {
  color: "var(--color-field-ink-muted)",
  lineHeight: 1.15,
  fontSize: "0.6875rem",
  fontWeight: 510,
  fontVariantNumeric: "tabular-nums" as const,
};

/**
 * View-only timer cluster:
 * primary = session elapsed since Start
 * secondary = phase / question / walk cue
 */
export function MapTimerCluster({
  sessionRules,
  timerState,
  timerRunning,
  timerHasStarted,
  pendingQuestions = [],
  myUid = null,
  hostUid = null,
  seekerLocations = [],
}: MapTimerClusterProps) {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const timerTickMs = getPowerProfile(lowPowerMode).timerTickMs;
  const nowMs = useServerNowMs(timerHasStarted && isTimerRunning(timerState) ? timerTickMs : null);
  const staleWalkNowMs = useStaleWalkNowMs();

  if (!timerHasStarted) {
    return null;
  }

  const elapsed = computeElapsedMs(timerState, nowMs);
  const sessionLabel = formatElapsedTime(elapsed);
  const hidingActive = isHidingPeriodActive(sessionRules, elapsed);
  const hidingLabel = formatHidingPeriodCountdown(hidingPeriodRemainingMs(sessionRules, elapsed));
  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, sessionRules, nowMs);

  let secondaryLabel: string | null;
  let secondaryColor = "var(--color-field-ink-muted)";

  if (questionTimer) {
    const primaryQuestion = pendingQuestions.find(
      (question) => question.id === questionTimer.pendingQuestionId,
    );
    const isWalkingThermometer =
      primaryQuestion?.toolType === "thermometer" && primaryQuestion.status === "walking";
    const walkerLocationUpdatedAt =
      primaryQuestion == null
        ? null
        : (seekerLocations.find((location) => location.uid === primaryQuestion.createdByUid)
            ?.updatedAt ?? null);
    const showStuckCue =
      isWalkingThermometer &&
      primaryQuestion != null &&
      myUid === hostUid &&
      isStaleThermometerWalk(primaryQuestion, walkerLocationUpdatedAt, staleWalkNowMs);

    if (showStuckCue) {
      secondaryLabel = "Stale GPS";
      secondaryColor = "var(--color-halt)";
    } else if (questionTimer.countdownLabel === "WALKING") {
      secondaryLabel = "Walking";
      secondaryColor = "var(--color-signal)";
    } else {
      secondaryLabel = `${questionTimer.toolLabel} ${questionTimer.countdownLabel}`;
      secondaryColor = "var(--color-signal)";
    }
  } else if (hidingActive && hidingLabel) {
    secondaryLabel = hidingLabel;
  } else {
    secondaryLabel = formatElapsedTime(seekPhaseElapsedMs(sessionRules, elapsed));
  }

  return (
    <Stack
      gap={0}
      align="flex-end"
      aria-live="polite"
      style={{ opacity: timerRunning ? 1 : 0.72, minWidth: 0 }}
    >
      <Text component="span" ff="monospace" style={primaryStyle} title="Session time since start">
        {sessionLabel}
      </Text>
      {secondaryLabel ? (
        <Text
          component="span"
          ff="monospace"
          style={{ ...secondaryStyle, color: secondaryColor }}
          title="Phase or question timer"
        >
          {secondaryLabel}
        </Text>
      ) : null}
    </Stack>
  );
}
