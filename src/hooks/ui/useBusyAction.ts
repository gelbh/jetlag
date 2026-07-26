import { useCallback, useRef, useState } from "react";

export interface BusyActionState {
  busy: boolean;
  error: Error | null;
  run: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>;
  clearError: () => void;
}

/**
 * Generation-safe local busy wrapper for button/form mutations.
 * Overlapping runs ignore stale settle so busy never sticks after the latest run.
 */
export function useBusyAction(): BusyActionState {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const generationRef = useRef(0);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const run = useCallback(async <T,>(asyncFn: () => Promise<T>) => {
    const generation = ++generationRef.current;
    setBusy(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (generation === generationRef.current) {
        setBusy(false);
      }
      return result;
    } catch (caught) {
      if (generation === generationRef.current) {
        setBusy(false);
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
      return undefined;
    }
  }, []);

  return { busy, error, run, clearError };
}
