import { useCallback, useRef, useState } from "react";

export function useSubmitLock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const runLocked = useCallback(async (fn: () => Promise<void>) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    try {
      await fn();
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, runLocked };
}
