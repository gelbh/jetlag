import { flushSync } from "react-dom";

export type NavRevealDirection = "forward" | "back" | "neutral";

const FALLBACK_CLASS_BY_DIRECTION: Record<NavRevealDirection, string> = {
  forward: "jl-route-fallback-enter-forward",
  back: "jl-route-fallback-enter-back",
  neutral: "jl-route-fallback-enter-neutral",
};

const FALLBACK_TIMEOUT_MS = 400;

let activeViewTransition: ViewTransition | null = null;

export function setNavDirection(direction: NavRevealDirection): void {
  document.documentElement.dataset.navDirection = direction;
}

function runFallbackAnimation(direction: NavRevealDirection): Promise<void> {
  const shell = document.getElementById("root");
  if (!shell) {
    return Promise.resolve();
  }

  const className = FALLBACK_CLASS_BY_DIRECTION[direction];
  shell.classList.remove(...Object.values(FALLBACK_CLASS_BY_DIRECTION));
  shell.classList.add(className);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      shell.classList.remove(className);
      shell.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(timeoutId);
      resolve();
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== shell) {
        return;
      }
      finish();
    };
    shell.addEventListener("animationend", onAnimationEnd);
    const timeoutId = window.setTimeout(finish, FALLBACK_TIMEOUT_MS);
  });
}

/**
 * Custom route reveal step (chassis lock: keep `viewTransition: false` on RR
 * navigate). RR VT alone cannot own warm/settle/direction; this helper is the
 * pluggable reveal after the orchestrator decides. `animate` is
 * `useMotionProfile().decorativeAnimate` (reduced-motion + low-power), not a
 * separate flag. When true and VT exists, `commit` runs under flushSync inside
 * `startViewTransition`; otherwise commit only (or CSS fallback if VT missing).
 */
export function revealRouteTransition(
  direction: NavRevealDirection,
  animate: boolean,
  commit: () => void,
): Promise<void> {
  setNavDirection(direction);

  // Decorative off: instant commit, no VT and no fallback enter class.
  if (!animate) {
    commit();
    return Promise.resolve();
  }

  // Hidden documents reject VT; skip to avoid uncaught InvalidStateError noise.
  if (document.visibilityState === "hidden") {
    commit();
    return Promise.resolve();
  }

  if (typeof document.startViewTransition !== "function") {
    commit();
    return runFallbackAnimation(direction);
  }

  activeViewTransition?.skipTransition();
  activeViewTransition = null;

  try {
    // flushSync so React commits the new route before VT captures the after tree.
    const transition = document.startViewTransition(() => {
      flushSync(commit);
    });
    activeViewTransition = transition;

    return transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (activeViewTransition === transition) {
          activeViewTransition = null;
        }
      });
  } catch {
    commit();
    return Promise.resolve();
  }
}

/** Skip any in-flight view transition and drop the handle (resume / hide). */
export function clearActiveRevealTransition(): void {
  activeViewTransition?.skipTransition();
  activeViewTransition = null;
}

export function clearActiveRevealTransitionForTests(): void {
  clearActiveRevealTransition();
}
