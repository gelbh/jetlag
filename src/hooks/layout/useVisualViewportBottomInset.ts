import { useEffect, useState } from "react";

/** Ignore small visual-viewport offsets (iOS home indicator); treat as keyboard. */
const KEYBOARD_INSET_THRESHOLD_PX = 100;

/**
 * Input types that typically open a soft keyboard.
 * Deliberately narrower than shortcut “typing target” checks (which also
 * treat `select` / any `input` as blocking hotkeys) — select pickers must
 * not lift map chrome.
 */
const SOFT_KEYBOARD_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "tel",
  "url",
  "password",
  "number",
]);

function isSoftKeyboardEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return SOFT_KEYBOARD_INPUT_TYPES.has(target.type);
  }
  return false;
}

function readBottomInset(viewport: VisualViewport): number {
  const rawBottom = Math.max(
    0,
    window.innerHeight - viewport.height - viewport.offsetTop,
  );
  if (rawBottom < KEYBOARD_INSET_THRESHOLD_PX) {
    return 0;
  }
  if (!isSoftKeyboardEditable(document.activeElement)) {
    return 0;
  }
  return rawBottom;
}

export function useVisualViewportBottomInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      setInset(readBottomInset(viewport));
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    // focusin is enough: blur moves focus to body, then resize/scroll or
    // resume listeners re-read activeElement (avoid focusout timing races).
    window.addEventListener("focusin", update);
    // iOS Safari often reports a stale large inset after background→foreground
    // until these fire; without them the dock can sit mid-screen.
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled]);

  return enabled ? inset : 0;
}
