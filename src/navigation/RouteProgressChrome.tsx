import { useRouteTransition } from "./useRouteTransition";

/** In-shell settle progress (never a full-bleed cover). */
export function RouteProgressChrome() {
  const { phase, loadingProgress } = useRouteTransition();
  if (phase !== "settling" || !loadingProgress) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-banner)] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <p className="pointer-events-none rounded-md border border-border bg-surface-panel/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-hud-float">
        {loadingProgress.currentStepLabel}
      </p>
    </div>
  );
}
