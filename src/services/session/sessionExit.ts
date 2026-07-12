import type { useAppNavigate } from "../../hooks/useAppNavigate";
import {
  clearSessionLocalArtifacts,
  teardownSessionUiState,
} from "./sessionCleanup";
import { useSessionStore } from "../../state/sessionStore";

export type SessionExitReason = "leave" | "end" | "remote-ended" | "reset";

export interface ExitSessionParams {
  reason: SessionExitReason;
  sessionId: string;
  navigate: ReturnType<typeof useAppNavigate>;
  navigateTo?: "/" | "/create" | string;
  animate?: boolean;
  replace?: boolean;
  closeOverlays?: () => void;
  remoteNotice?: string | null;
}

const EXIT_TRANSITION_MS = 320;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function currentPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname;
}

async function waitForExitTransition(animate: boolean): Promise<void> {
  if (!animate || prefersReducedMotion()) {
    return;
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, EXIT_TRANSITION_MS);
  });
}

let exitInFlight = false;

/** Single front door for leaving, ending, or clearing a session with nav-first teardown. */
export async function exitSession({
  reason,
  sessionId,
  navigate,
  navigateTo = "/",
  animate = true,
  replace = false,
  closeOverlays,
  remoteNotice = null,
}: ExitSessionParams): Promise<void> {
  if (exitInFlight) {
    return;
  }

  exitInFlight = true;

  try {
    closeOverlays?.();

    const shouldAnimate = animate && !prefersReducedMotion();
    const needsNavigation = currentPathname() !== navigateTo;

    if (needsNavigation) {
      navigate(navigateTo, {
        replace,
        direction: shouldAnimate && !replace ? "back" : replace ? "replace" : "forward",
      });
      await waitForExitTransition(shouldAnimate);
    }

    teardownSessionUiState();
    await clearSessionLocalArtifacts(sessionId);
    useSessionStore.getState().setSession(null);

    if (remoteNotice) {
      useSessionStore.getState().setRemoteUpdateNotice(remoteNotice);
    }

    void reason;
  } finally {
    exitInFlight = false;
  }
}

/** @internal Test-only reset for in-flight guard. */
export function resetExitSessionGuardForTests(): void {
  exitInFlight = false;
}
