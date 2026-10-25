import { Progress } from "@mantine/core";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
import { formatEta } from "@/domain/progress/estimator";
import { useLoadTask, useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { PACK_PLAY_AREA_TASK } from "@/services/core/progress/namedTasks";
import { routeProgressPercent } from "./routeLoadingSteps";
import { useRouteTransition } from "./useRouteTransition";

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
      <div
        className="pointer-events-none w-full max-w-xs space-y-1 rounded-md px-3 py-1.5 text-xs font-semibold text-field-ink"
        style={{
          ...mapChromeSurfaceStyles,
          color: "var(--color-field-ink)",
        }}
      >
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
          styles={{
            root: { backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)" },
            section: { backgroundColor: "var(--color-signal)" },
          }}
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
