import { useEffect, useState } from "react";

/** Ignore small visual-viewport offsets (iOS home indicator); treat as keyboard. */
const KEYBOARD_INSET_THRESHOLD_PX = 100;

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "radio",
  "submit",
  "reset",
  "file",
  "image",
  "range",
  "color",
  "hidden",
]);

function isTextEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLSelectElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(target.type);
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
  if (!isTextEditable(document.activeElement)) {
    return 0;
  }
  return rawBottom;
}

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
      setInset(readBottomInset(viewport));
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled]);

  return enabled ? inset : 0;
}
