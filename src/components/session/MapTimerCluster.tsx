import { useEffect, useState } from "react";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import { getPowerProfile } from "../../domain/device/powerProfile";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "../../domain/session/timer";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "../../domain/session/hidingPeriod";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/sessionChat";
import {
  isStaleThermometerWalk,
  selectPrimaryQuestionTimer,
} from "../../domain/questions";
import { useMapStore } from "../../state/mapStore";

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
        Date.now(),
      );
    const countdownLabel = showStuckCue
      ? "STUCK?"
      : questionTimer.countdownLabel;

    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p
          className="jl-ticker jl-ticker-question jl-ticker-active"
          aria-live="polite"
        >
          <span className="jl-ticker-phase">{questionTimer.toolLabel}</span>
          <span className="jl-ticker-value tabular-nums">
            {countdownLabel}
          </span>
        </p>
        {canCancelWalk ? (
          <button
            type="button"
            onClick={() => onCancelWalkingQuestion?.(primaryQuestion.id)}
            className="jl-ticker jl-ticker-secondary text-highlight"
            aria-label="Cancel thermometer walk"
          >
            Cancel
          </button>
        ) : null}
        {hidingActive && hidingLabel ? (
          <p className="jl-ticker-secondary tabular-nums">{hidingLabel}</p>
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
    );
  }

  if (hidingActive && hidingLabel) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
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
    <div className="flex shrink-0 flex-col items-end gap-0.5">
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
