export type NavRevealDirection = "forward" | "back" | "neutral";

let activeRevealTransition: ViewTransition | null = null;

export function revealRouteTransition(
  direction: NavRevealDirection,
  animate: boolean,
): Promise<void> {
  document.documentElement.dataset.navDirection = direction;

  if (!animate || typeof document.startViewTransition !== "function") {
    return Promise.resolve();
  }

  activeRevealTransition?.skipTransition();
  activeRevealTransition = null;

  try {
    const transition = document.startViewTransition(() => {
      // Destination is already mounted; capture the reveal frame.
    });
    activeRevealTransition = transition;

    return transition.finished
      .catch(() => undefined)
      .finally(() => {
        if (activeRevealTransition === transition) {
          activeRevealTransition = null;
        }
      });
  } catch {
    return Promise.resolve();
  }
}

export function clearActiveRevealTransitionForTests(): void {
  activeRevealTransition = null;
}
