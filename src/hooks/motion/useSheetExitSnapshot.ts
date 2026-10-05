import { useCallback, useEffect, useRef, useState } from "react";
import { useSheetExitMount } from "./useSheetExitMount";

/**
 * Mount-through-exit plus last live snapshot while open. While open, snapshot
 * tracks `live` (caller should keep `live` referentially stable when unchanged).
 * Cleared when the host unmounts after exit.
 */
export function useSheetExitSnapshot<T>(
  open: boolean,
  live: T | null,
): {
  mounted: boolean;
  open: boolean;
  snapshot: T | null;
  onExitTransitionEnd: () => void;
} {
  const exit = useSheetExitMount(open);
  const [snapshot, setSnapshot] = useState<T | null>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  if (open && live != null && !Object.is(snapshot, live)) {
    setSnapshot(live);
  }
  if (!exit.mounted && snapshot != null) {
    setSnapshot(null);
  }

  const onExitTransitionEnd = useCallback(() => {
    exit.onExitTransitionEnd();
    if (!openRef.current) {
      setSnapshot(null);
    }
  }, [exit.onExitTransitionEnd]);

  return {
    mounted: exit.mounted,
    open: exit.open,
    snapshot: open && live != null ? live : snapshot,
    onExitTransitionEnd,
  };
}
