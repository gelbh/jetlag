import { Progress } from "@mantine/core";
import { useRouteTransition } from "./useRouteTransition";

/** Share of the bar a step shows while it is still running, so the bar moves on entry. */
const RUNNING_STEP_CREDIT = 0.35;

/** In-shell settle progress (never a full-bleed cover). */
export function RouteProgressChrome() {
  const { phase, loadingProgress } = useRouteTransition();
  if (phase !== "settling" || !loadingProgress) {
    return null;
  }

  const total = Math.max(1, loadingProgress.steps.length);
  const stepNumber = Math.min(total, loadingProgress.currentStepIndex + 1);
  const percent = Math.round(
    ((loadingProgress.currentStepIndex + RUNNING_STEP_CREDIT) / total) * 100,
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-banner)] flex justify-center px-3 pt-[max(0.5rem,var(--safe-area-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none w-full max-w-xs space-y-1 rounded-md border border-border bg-surface-panel/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-hud-float">
        <p className="m-0">
          {total > 1 ? `Step ${stepNumber} of ${total} · ` : ""}
          {loadingProgress.currentStepLabel}
        </p>
        <Progress
          value={percent}
          size={3}
          radius="xl"
          aria-label={`Opening ${loadingProgress.destinationTitle}`}
          className="motion-reduce:[&_*]:transition-none"
        />
      </div>
    </div>
  );
}
