import { LoadingSpinnerRing } from "../components/ui/LoadingSpinner";
import { useRouteTransition } from "./useRouteTransition";

export function RouteTransitionOverlay() {
  const { phase, loadingProgress } = useRouteTransition();

  if (phase !== "loading" && phase !== "revealing") {
    return null;
  }

  const exiting = phase === "revealing";
  const progress = loadingProgress;
  const destinationTitle = progress?.destinationTitle ?? "Loading";
  const stepLabel = progress?.currentStepLabel ?? "Loading…";
  const totalSteps = progress?.steps.length ?? 1;
  const currentStep = progress ? progress.currentStepIndex + 1 : 1;
  const progressPercent =
    totalSteps > 0 ? Math.min(100, (currentStep / totalSteps) * 100) : 0;
  const ariaLabel = `${destinationTitle}: ${stepLabel}`;

  return (
    <output
      className={`route-transition-overlay${
        exiting ? " route-transition-overlay--exiting" : ""
      }`}
      aria-busy={!exiting}
      aria-label={ariaLabel}
    >
      <div className="route-transition-overlay-content">
        <LoadingSpinnerRing size="md" className="text-brand-blue" />
        <h2 className="route-transition-overlay-title">{destinationTitle}</h2>
        {totalSteps > 1 ? (
          <div className="jl-preload-detail-panel__progress route-transition-overlay-progress">
            <div className="jl-preload-detail-panel__progress-meta">
              <span className="jl-preload-detail-panel__progress-label">
                Progress
              </span>
              <span
                className="jl-preload-detail-panel__progress-count tabular-nums"
                aria-live="polite"
              >
                {currentStep}/{totalSteps}
              </span>
            </div>
            <div
              className="jl-preload-detail-panel__progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={currentStep}
              aria-label={`${destinationTitle} loading progress, ${currentStep} of ${totalSteps}`}
            >
              <span
                className="jl-preload-detail-panel__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        <span className="route-transition-overlay-label" aria-live="polite">
          {stepLabel}
        </span>
      </div>
    </output>
  );
}
