import { useCallback, useEffect, useRef, useState } from "react";
import { MOTION_SHEET_PRESENT_MS } from "@/domain/device/motion/motionTokens";

/**
 * Keep a sheet host mounted while open, and through the exit transition after
 * open becomes false. Drop mount on onExitTransitionEnd, or after the sheet
 * duration if the exit callback never fires.
 */
export function useSheetExitMount(open: boolean): {
  mounted: boolean;
  open: boolean;
  onExitTransitionEnd: () => void;
} {
  const [mounted, setMounted] = useState(open);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  if (open && !mounted) {
    setMounted(true);
  }

  const onExitTransitionEnd = useCallback(() => {
    if (!openRef.current) {
      setMounted(false);
    }
  }, []);

  useEffect(() => {
    if (open || !mounted) {
      return;
    }
    const id = window.setTimeout(() => {
      if (!openRef.current) {
        setMounted(false);
      }
    }, MOTION_SHEET_PRESENT_MS + 50);
    return () => window.clearTimeout(id);
  }, [open, mounted]);

  return {
    mounted,
    open,
    onExitTransitionEnd,
  };
}
