import { useEffect, useState } from "react";

/** Ignore small visual-viewport offsets (iOS home indicator); treat as keyboard. */
const KEYBOARD_INSET_THRESHOLD_PX = 100;

export function useVisualViewportBottomInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      const rawBottom = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setInset(
        rawBottom >= KEYBOARD_INSET_THRESHOLD_PX ? rawBottom : 0,
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return enabled ? inset : 0;
}
