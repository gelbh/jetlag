import { LoadingSpinnerRing } from "../components/ui/LoadingSpinner";
import type { RouteLoadingReason } from "./routeTransitionContextInstance";
import { useRouteTransition } from "./useRouteTransition";

const LOADING_LABELS: Record<RouteLoadingReason, string> = {
  page: "Loading…",
  map: "Loading map…",
  "sign-in": "Signing in…",
  premium: "Loading premium…",
  admin: "Loading admin…",
};

export function RouteTransitionOverlay() {
  const { phase, loadingReason } = useRouteTransition();

  if (phase !== "loading") {
    return null;
  }

  const label = LOADING_LABELS[loadingReason ?? "page"];

  return (
    <output
      className="route-transition-overlay"
      aria-busy="true"
      aria-label={label}
    >
      <div className="route-transition-overlay-content">
        <LoadingSpinnerRing size="md" className="text-brand-blue" />
        <span className="route-transition-overlay-label">{label}</span>
      </div>
    </output>
  );
}
