export type NavRevealDirection = "forward" | "back" | "neutral";

export function revealRouteTransition(
  direction: NavRevealDirection,
  animate: boolean,
): Promise<void> {
  document.documentElement.dataset.navDirection = direction;

  if (!animate || typeof document.startViewTransition !== "function") {
    return Promise.resolve();
  }

  return document.startViewTransition(() => {
    // Destination is already mounted; capture the reveal frame.
  }).finished.catch(() => undefined);
}
