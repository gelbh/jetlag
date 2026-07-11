import type { TimerState } from "../../../domain/session/timer";
import { PopupCloseButton } from "../../ui/PopupCloseButton";
import { TimerActions } from "../../tools/TimerActions";
import { SessionTimerLabel } from "../SessionTimerLabel";

interface TimerBlockProps {
  open: boolean;
  onClose: () => void;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onOpenLog?: () => void;
  disabled?: boolean;
}

export function TimerBlock({
  open,
  onClose,
  timerState,
  timerRunning,
  timerHasStarted,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onOpenLog,
  disabled = false,
}: TimerBlockProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="hud-panel pointer-events-auto absolute inset-x-3 top-[calc(100%+0.375rem)] z-[var(--z-panel)] mx-auto max-w-md space-y-2 p-3 pt-10"
      role="menu"
      aria-label="Timer settings"
    >
      <PopupCloseButton label="Close timer settings" onClick={onClose} />
      <p className="px-1 font-mono text-2xl font-bold tabular-nums text-ink">
        <SessionTimerLabel timerState={timerState} />
      </p>
      <TimerActions
        timerRunning={timerRunning}
        timerHasStarted={timerHasStarted}
        onTimerStart={onTimerStart}
        onTimerPause={onTimerPause}
        onTimerReset={onTimerReset}
        onOpenLog={onOpenLog}
        disabled={disabled}
      />
    </div>
  );
}
