import { Capacitor } from "@capacitor/core";
import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from "@capacitor/haptics";
import { impactLight } from "./hapticsService";

export type FeedbackEvent =
  | "tap"
  | "selection"
  | "success"
  | "error"
  | "sheetSnap";

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
  } catch {
    // Progressive enhancement only.
  }
}

async function nativeFeedback(event: FeedbackEvent): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    vibrateFallback(event);
    return;
  }

  try {
    switch (event) {
      case "tap":
      case "sheetSnap":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "selection":
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case "error":
        await Haptics.notification({ type: NotificationType.Error });
        break;
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  } catch {
    vibrateFallback(event);
  }
}

/** Unified tactile feedback — Capacitor native with Vibration API fallback on web. */
export async function feedback(event: FeedbackEvent): Promise<void> {
  if (event === "tap") {
    await impactLight();
    if (!Capacitor.isNativePlatform()) {
      vibrateFallback("tap");
    }
    return;
  }

  await nativeFeedback(event);
}

const DELEGATED_FEEDBACK_SELECTOR =
  '[data-feedback="tap"], .hud-chrome, .home-card-btn, .btn-primary, .btn-secondary, .jl-tool-slot';

/** One delegated listener for tap feedback on common HUD controls. */
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
