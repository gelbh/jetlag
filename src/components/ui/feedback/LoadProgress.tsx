import { Progress, UnstyledButton } from "@mantine/core";
import { formatEta } from "@/domain/progress/estimator";
import { useLoadTask } from "@/hooks/progress/useLoadTask";
import type { LoadTask } from "@/services/core/progress/loadTask";

type LoadProgressVariant = "full" | "compact";

interface LoadProgressProps {
  task: LoadTask;
  variant?: LoadProgressVariant;
  /**
   * What the compact footer names: the task label, or the current step when the
   * surrounding card already has a title.
   */
  compactDetail?: "label" | "stage";
  className?: string;
}

const OVERDUE_TEXT = "Taking longer than usual";

function timeText(etaMs: number | null, overdue: boolean): string | null {
  if (overdue) {
    return OVERDUE_TEXT;
  }
  return etaMs === null ? null : formatEta(etaMs);
}

/** Determinate bar for a load task: label, stage, percent, ETA, and Cancel. */
export function LoadProgress({
  task,
  variant = "full",
  compactDetail = "label",
  className = "",
}: LoadProgressProps) {
  const snapshot = useLoadTask(task);
  if (!snapshot || snapshot.status !== "running") {
    return null;
  }

  const time = timeText(snapshot.etaMs, snapshot.overdue);
  const compact = variant === "compact";

  return (
    <div className={`min-w-0 space-y-1 ${className}`.trim()} data-testid="load-progress">
      {/* Stage changes are announced; percent ticks are not. */}
      <div role="status" aria-live="polite" className="sr-only">
        {`${snapshot.label}. ${snapshot.stageLabel}.`}
      </div>
      {!compact ? (
        <p className="m-0 text-sm text-field-ink" aria-hidden>
          {snapshot.label}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Progress.Root
          size={compact ? 4 : 6}
          radius="xl"
          className="min-w-0 flex-1"
          styles={{
            root: { backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)" },
          }}
        >
          {/* Mantine's own aria-valuetext ("40%") would override ours, so set them here. */}
          <Progress.Section
            value={snapshot.percent}
            withAria={false}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={snapshot.percent}
            aria-label={snapshot.label}
            aria-valuetext={snapshot.valueText}
            className="motion-reduce:transition-none"
            styles={{ section: { backgroundColor: "var(--color-signal)" } }}
          />
        </Progress.Root>
        <span className="shrink-0 font-mono text-xs tabular-nums text-field-ink-muted" aria-hidden>
          {snapshot.percent}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-field-ink-muted">
        <span className="flex min-w-0 flex-1 items-baseline gap-1" aria-hidden={compact}>
          {/* The label may truncate; the time text must stay whole. */}
          <span className="min-w-0 truncate">
            {compact && compactDetail === "label" ? snapshot.label : snapshot.stageLabel}
          </span>
          {time ? <span className="shrink-0 whitespace-nowrap">· {time}</span> : null}
        </span>
        {snapshot.cancellable ? (
          <UnstyledButton
            type="button"
            onClick={() => task.cancel()}
            className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-field-ink underline-offset-2 hover:underline focus-visible:outline-2"
          >
            Cancel
          </UnstyledButton>
        ) : null}
      </div>
    </div>
  );
}
