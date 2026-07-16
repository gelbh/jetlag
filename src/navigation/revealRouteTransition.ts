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
 * Runs `commit` (a navigation) inside `document.startViewTransition` so WebKit
 * captures distinct before/after snapshots, falling back to a CSS enter class
 * when the View Transitions API is unavailable. `animate` should reflect
 * decorative motion (reduced motion + low power), matching the CSS gates.
 */
export function revealRouteTransition(
  direction: NavRevealDirection,
  animate: boolean,
  commit: () => void,
): Promise<void> {
  setNavDirection(direction);

  if (!animate) {
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

export function clearActiveRevealTransitionForTests(): void {
  activeViewTransition = null;
}
