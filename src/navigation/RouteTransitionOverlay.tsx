import { LoadingSpinnerRing } from "../components/ui/LoadingSpinner";
import { useRouteTransition } from "./useRouteTransition";

export function RouteTransitionOverlay() {
  const { phase } = useRouteTransition();

  if (phase !== "loading") {
    return null;
  }

  return (
    <div
      className="route-transition-overlay"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Loading page"
    >
      <div className="route-transition-overlay-content">
        <LoadingSpinnerRing size="md" className="text-brand-blue" />
        <span className="route-transition-overlay-label">Loading…</span>
      </div>
    </div>
  );
}
