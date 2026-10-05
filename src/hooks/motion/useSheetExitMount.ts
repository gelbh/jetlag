import { useState } from "react";

/**
 * Keep a sheet host mounted while open, and through the exit transition after
 * open becomes false. Drop mount on onExitTransitionEnd (or immediately when
 * already closed).
 */
export function useSheetExitMount(open: boolean): {
  mounted: boolean;
  open: boolean;
  onExitTransitionEnd: () => void;
} {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) {
    setMounted(true);
  }

  return {
    mounted,
    open,
    onExitTransitionEnd: () => {
      if (!open) {
        setMounted(false);
      }
    },
  };
}
