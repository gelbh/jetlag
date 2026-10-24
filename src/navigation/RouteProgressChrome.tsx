import { Progress } from "@mantine/core";
import { formatEta } from "@/domain/progress/estimator";
import { useLoadTask, useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { PACK_PLAY_AREA_TASK } from "@/services/core/progress/namedTasks";
import type { RouteLoadingProgress } from "./routeLoadingSteps";
import { useRouteTransition } from "./useRouteTransition";

/** Share of the bar a step shows while it is still running, so the bar moves on entry. */
const RUNNING_STEP_CREDIT = 0.35;

/**
 * Overall percent: finished steps plus the current step's share. `stepPercent`
 * is the current step's own load task, when it has one; otherwise a fixed credit.
 */
export function routeProgressPercent(
  progress: Pick<RouteLoadingProgress, "steps" | "currentStepIndex">,
  stepPercent: number | null,
): number {
  const total = Math.max(1, progress.steps.length);
  const stepCredit = stepPercent === null ? RUNNING_STEP_CREDIT : stepPercent / 100;
  return Math.round(((progress.currentStepIndex + stepCredit) / total) * 100);
}

export function RouteProgressChrome() {
  const { phase, loadingProgress } = useRouteTransition();
  const boundaryTask = useNamedLoadTask(PACK_PLAY_AREA_TASK);
  const boundarySnapshot = useLoadTask(boundaryTask);
  if (phase !== "settling" || !loadingProgress) {
    return null;
  }

  const total = Math.max(1, loadingProgress.steps.length);
  const stepNumber = Math.min(total, loadingProgress.currentStepIndex + 1);
  const onBoundaryStep =
    loadingProgress.steps[loadingProgress.currentStepIndex] === "load-boundaries" &&
    boundarySnapshot?.status === "running";
  const percent = routeProgressPercent(
    loadingProgress,
    onBoundaryStep ? boundarySnapshot.percent : null,
  );
  const eta =
    onBoundaryStep && boundarySnapshot.etaMs !== null ? formatEta(boundarySnapshot.etaMs) : null;

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
        {eta ? (
          <p className="m-0 font-normal text-ink-muted" aria-hidden>
            {eta}
          </p>
        ) : null}
      </div>
    </div>
  );
}
