export function TimerActions({
  timerRunning,
  timerHasStarted,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onOpenLog,
  disabled = false,
}: {
  timerRunning: boolean;
  timerHasStarted: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onOpenLog?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${onOpenLog ? "grid-cols-3" : "grid-cols-2"}`}>
      <button
        type="button"
        onClick={timerRunning ? onTimerPause : onTimerStart}
        disabled={disabled}
        className="btn-primary disabled:opacity-40"
      >
        {timerRunning ? "Pause" : timerHasStarted ? "Resume" : "Start"}
      </button>
      <button
        type="button"
        onClick={onTimerReset}
        disabled={disabled || !timerHasStarted}
        className="btn-secondary disabled:opacity-40"
      >
        Reset
      </button>
      {onOpenLog ? (
        <button type="button" onClick={onOpenLog} className="btn-secondary">
          Log
        </button>
      ) : null}
    </div>
  );
}
