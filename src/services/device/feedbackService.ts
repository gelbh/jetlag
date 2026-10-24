export type FeedbackEvent = "tap" | "selection" | "success" | "error" | "sheetSnap";

const VIBRATION_MS: Partial<Record<FeedbackEvent, number>> = {
  tap: 10,
  selection: 5,
  sheetSnap: 8,
};

function vibrateFallback(event: FeedbackEvent): void {
  const duration = VIBRATION_MS[event];
  if (!duration || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  try {
    navigator.vibrate(duration);
  } catch {}
}

export async function feedback(event: FeedbackEvent): Promise<void> {
  vibrateFallback(event === "tap" ? "tap" : event);
}

const DELEGATED_FEEDBACK_SELECTOR =
  '[data-feedback="tap"], .hud-chrome, .btn-primary, .btn-secondary, .jl-tool-slot';

export function bindDelegatedTapFeedback(root: ParentNode = document): () => void {
  const handlePointerUp = (event: Event) => {
    const pointerEvent = event as PointerEvent;
    const target = pointerEvent.target;
    if (!(target instanceof Element)) {
      return;
    }

    const interactive = target.closest(DELEGATED_FEEDBACK_SELECTOR);
    if (!interactive || interactive.hasAttribute("disabled")) {
      return;
    }

    if (interactive.getAttribute("data-feedback") === "off") {
      return;
    }

    void feedback("tap");
  };

  root.addEventListener("pointerup", handlePointerUp);
  return () => root.removeEventListener("pointerup", handlePointerUp);
}
