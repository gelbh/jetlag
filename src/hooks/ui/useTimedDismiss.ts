import { useEffect } from "react";

export function useTimedDismiss(input: {
  active: boolean;
  ms: number;
  onDismiss: () => void;
  /** When `active` stays true, changing this restarts the timer (e.g. new reveal payload). */
  restartKey?: unknown;
}): void {
  const { active, ms, onDismiss, restartKey } = input;

  useEffect(() => {
    if (!active) {
      return;
    }
    const id = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(id);
  }, [active, ms, onDismiss, restartKey]);
}
