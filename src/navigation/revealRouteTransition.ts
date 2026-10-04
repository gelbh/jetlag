export type NavRevealDirection = "forward" | "back" | "neutral";

export function setNavDirection(direction: NavRevealDirection): void {
  document.documentElement.dataset.navDirection = direction;
}

/**
 * Custom route reveal step (chassis lock: keep `viewTransition: false` on RR
 * navigate). RR VT alone cannot own warm/settle/direction; this helper runs
 * after the orchestrator decides. `_animate` mirrors
 * `useMotionProfile().decorativeAnimate` at call sites; decorative gating lives
 * on `PlayerRouteViewTransition`. Plain commit only; no manual VT.
 */
export function revealRouteTransition(
  direction: NavRevealDirection,
  _animate: boolean,
  commit: () => void,
): Promise<void> {
  setNavDirection(direction);
  commit();
  return Promise.resolve();
}

/** Safe stub while reveal no longer starts document view transitions. */
export function clearActiveRevealTransition(): void {}

export function clearActiveRevealTransitionForTests(): void {
  clearActiveRevealTransition();
}
