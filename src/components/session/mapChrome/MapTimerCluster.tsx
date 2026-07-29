import { useEffect, useState } from "react";
import type { SessionRulesInput } from "../../../domain/session/rules";
import { getPowerProfile } from "../../../domain/device/powerProfile";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "../../../domain/session/timer/timer";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "../../../domain/session/hiding/hidingPeriod";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../../domain/session/activity/sessionChat";
import {
  isStaleThermometerWalk,
  selectPrimaryQuestionTimer,
} from "../../../domain/questions";
import { useMapStore } from "../../../state/mapStore";
import { useStaleWalkNowMs } from "../../../hooks/sync/useStaleWalkNowMs";

interface MapTimerClusterProps {
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  myUid?: string | null;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  onOpenTimerMenu: () => void;
  timerMenuOpen: boolean;
}

function formatSeekPhaseTime(
  sessionRules: SessionRulesInput,
  timerState: TimerState,
): string {
  const elapsed = computeElapsedMs(timerState);
  return formatElapsedTime(seekPhaseElapsedMs(sessionRules, elapsed));
}

function formatSessionElapsedDuringHiding(timerState: TimerState): string {
  return formatElapsedTime(computeElapsedMs(timerState));
}

export function MapTimerCluster({
  sessionRules,
  timerState,
  timerRunning,
  timerHasStarted,
  pendingQuestions = [],
  myUid = null,
  hostUid = null,
  seekerLocations = [],
  onCancelWalkingQuestion,
  onOpenTimerMenu,
  timerMenuOpen,
}: MapTimerClusterProps) {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const timerTickMs = getPowerProfile(lowPowerMode).timerTickMs;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!timerHasStarted || !isTimerRunning(timerState)) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, timerTickMs);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart interval when run anchor changes
  }, [timerHasStarted, timerState.runningSince, timerTickMs]);

  void tick;
  const staleWalkNowMs = useStaleWalkNowMs();

  if (!timerHasStarted) {
    return null;
  }

  const elapsed = computeElapsedMs(timerState);
  const hidingActive = isHidingPeriodActive(sessionRules, elapsed);
  const hidingRemaining = hidingPeriodRemainingMs(sessionRules, elapsed);
  const hidingLabel = formatHidingPeriodCountdown(hidingRemaining);
  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, sessionRules);
  const tickerRunningClass = timerRunning
    ? "jl-ticker-active"
    : "jl-ticker-idle";

  if (questionTimer) {
    const primaryQuestion = pendingQuestions.find(
      (question) => question.id === questionTimer.pendingQuestionId,
    );
    const isWalkingThermometer =
      primaryQuestion?.toolType === "thermometer" &&
      primaryQuestion.status === "walking";
    const canCancelWalk =
      isWalkingThermometer &&
      Boolean(onCancelWalkingQuestion) &&
      myUid != null &&
      (myUid === hostUid || myUid === primaryQuestion.createdByUid);
    const walkerLocationUpdatedAt =
      primaryQuestion == null
        ? null
        : (seekerLocations.find(
            (location) => location.uid === primaryQuestion.createdByUid,
          )?.updatedAt ?? null);
    const showStuckCue =
      isWalkingThermometer &&
      primaryQuestion != null &&
      myUid === hostUid &&
      isStaleThermometerWalk(
        primaryQuestion,
        walkerLocationUpdatedAt,
        staleWalkNowMs,
      );
    const countdownLabel = showStuckCue
      ? "STUCK?"
      : questionTimer.countdownLabel;

    return (
      <>
        <div className="jl-timer-cluster">
          <p
            className="jl-ticker jl-ticker-question jl-ticker-active"
            aria-live="polite"
          >
            <span className="jl-ticker-phase">{questionTimer.toolLabel}</span>
            <span className="jl-ticker-value tabular-nums">
              {countdownLabel}
            </span>
          </p>
          {hidingActive && hidingLabel ? (
            <p className="jl-ticker jl-ticker-secondary tabular-nums">
              <span className="jl-ticker-value">{hidingLabel}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={onOpenTimerMenu}
              className={`jl-ticker jl-ticker-secondary ${tickerRunningClass}`}
              aria-label="Seek phase time. Open timer settings"
              aria-expanded={timerMenuOpen}
              aria-haspopup="menu"
            >
              <span className="jl-ticker-phase">SEEK</span>
              <span className="jl-ticker-value tabular-nums">
                {formatSeekPhaseTime(sessionRules, timerState)}
              </span>
            </button>
          )}
        </div>
        {canCancelWalk ? (
          <button
            type="button"
            onClick={() => onCancelWalkingQuestion?.(primaryQuestion.id)}
            className="jl-timer-cancel"
            aria-label="Cancel thermometer walk"
          >
            Cancel
          </button>
        ) : null}
      </>
    );
  }

  if (hidingActive && hidingLabel) {
    return (
      <div className="jl-timer-cluster">
        <p className="jl-ticker jl-ticker-hiding jl-ticker-active" aria-live="polite">
          <span className="jl-ticker-value tabular-nums">{hidingLabel}</span>
        </p>
        <button
          type="button"
          onClick={onOpenTimerMenu}
          className={`jl-ticker jl-ticker-secondary ${tickerRunningClass}`}
          aria-label="Session elapsed. Open timer settings"
          aria-expanded={timerMenuOpen}
          aria-haspopup="menu"
        >
          <span className="jl-ticker-phase">SESSION</span>
          <span className="jl-ticker-value tabular-nums">
            {formatSessionElapsedDuringHiding(timerState)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="jl-timer-cluster">
      <button
        type="button"
        onClick={onOpenTimerMenu}
        className={`jl-ticker ${tickerRunningClass}`}
        aria-label="Seek phase time. Open timer settings"
        aria-expanded={timerMenuOpen}
        aria-haspopup="menu"
        aria-live="polite"
      >
        <span className="jl-ticker-phase">SEEK</span>
        <span className="jl-ticker-value tabular-nums">
          {formatSeekPhaseTime(sessionRules, timerState)}
        </span>
      </button>
    </div>
  );
}
