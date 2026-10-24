export type NavRevealDirection = "forward" | "back" | "neutral";

export function setNavDirection(direction: NavRevealDirection): void {
  document.documentElement.dataset.navDirection = direction;
}

export function revealRouteTransition(
  direction: NavRevealDirection,
  _animate: boolean,
  commit: () => void,
): Promise<void> {
  setNavDirection(direction);
  commit();
  return Promise.resolve();
}

export function clearActiveRevealTransition(): void {}

export function clearActiveRevealTransitionForTests(): void {
  clearActiveRevealTransition();
}
