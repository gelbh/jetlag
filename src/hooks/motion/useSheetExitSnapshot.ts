import { useCallback, useEffect, useRef, useState } from "react";
import { useSheetExitMount } from "./useSheetExitMount";

/**
 * Mount-through-exit plus last live snapshot while open. Snapshot updates only
 * while open; cleared with the host after onExitTransitionEnd / timeout.
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
  openRef.current = open;

  useEffect(() => {
    if (open && live != null) {
      setSnapshot(live);
    }
  }, [open, live]);

  useEffect(() => {
    if (!exit.mounted) {
      setSnapshot(null);
    }
  }, [exit.mounted]);

  const onExitTransitionEnd = useCallback(() => {
    exit.onExitTransitionEnd();
    if (!openRef.current) {
      setSnapshot(null);
    }
  }, [exit.onExitTransitionEnd]);

  return {
    mounted: exit.mounted,
    open: exit.open,
    snapshot,
    onExitTransitionEnd,
  };
}
