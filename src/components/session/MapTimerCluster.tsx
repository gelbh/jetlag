import { useEffect, useState } from "react";
import type { GameSize } from "../../domain/gameSize";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "../../domain/timer";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
  isHidingPeriodActive,
  seekPhaseElapsedMs,
} from "../../domain/hidingPeriod";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { selectPrimaryQuestionTimer } from "../../domain/questionTimerDisplay";

interface MapTimerClusterProps {
  gameSize: GameSize;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  pendingQuestions?: readonly PendingQuestionRecord[];
  onOpenTimerMenu: () => void;
  timerMenuOpen: boolean;
}

function formatSeekPhaseTime(gameSize: GameSize, timerState: TimerState): string {
  const elapsed = computeElapsedMs(timerState);
  return formatElapsedTime(seekPhaseElapsedMs(gameSize, elapsed));
}

function formatSessionElapsedDuringHiding(timerState: TimerState): string {
  return formatElapsedTime(computeElapsedMs(timerState));
}

export function MapTimerCluster({
  gameSize,
  timerState,
  timerRunning,
  timerHasStarted,
  pendingQuestions = [],
  onOpenTimerMenu,
  timerMenuOpen,
}: MapTimerClusterProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!timerHasStarted || !isTimerRunning(timerState)) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 250);

    return () => window.clearInterval(interval);
  }, [timerHasStarted, timerState.runningSince]);

  void tick;

  if (!timerHasStarted) {
    return null;
  }

  const elapsed = computeElapsedMs(timerState);
  const hidingActive = isHidingPeriodActive(gameSize, elapsed);
  const hidingRemaining = hidingPeriodRemainingMs(gameSize, elapsed);
  const hidingLabel = formatHidingPeriodCountdown(hidingRemaining);
  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, gameSize);
  const tickerRunningClass = timerRunning
    ? "jl-ticker-active"
    : "jl-ticker-idle";

  if (questionTimer) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p
          className="jl-ticker jl-ticker-question jl-ticker-active"
          aria-live="polite"
        >
          <span className="jl-ticker-phase">QUESTION</span>
          <span className="jl-ticker-value tabular-nums">
            {questionTimer.countdownLabel}
          </span>
        </p>
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
              {formatSeekPhaseTime(gameSize, timerState)}
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
          {formatSeekPhaseTime(gameSize, timerState)}
        </span>
      </button>
    </div>
  );
}
