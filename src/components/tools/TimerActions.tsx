interface TimerActionsProps {
  timerRunning: boolean;
  timerHasStarted: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onOpenLog?: () => void;
}

export function TimerActions({
  timerRunning,
  timerHasStarted,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onOpenLog,
}: TimerActionsProps) {
  return (
    <div className={`grid gap-2 ${onOpenLog ? "grid-cols-3" : "grid-cols-2"}`}>
      <button
        type="button"
        onClick={timerRunning ? onTimerPause : onTimerStart}
        className="min-h-12 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950"
      >
        {timerRunning ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        onClick={onTimerReset}
        disabled={!timerHasStarted}
        className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
      >
        Reset
      </button>
      {onOpenLog ? (
        <button
          type="button"
          onClick={onOpenLog}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Log
        </button>
      ) : null}
    </div>
  );
}
