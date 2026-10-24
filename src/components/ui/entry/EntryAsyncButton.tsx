import { Button, type ButtonProps } from "@mantine/core";
import {
  type ComponentPropsWithoutRef,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { LoadingSpinnerRing } from "@/components/ui/feedback/LoadingSpinner";
import { useLoadTask } from "@/hooks/progress/useLoadTask";
import type { LoadTask } from "@/services/core/progress/loadTask";

export type EntryAsyncButtonProps = Omit<
  ButtonProps & ComponentPropsWithoutRef<"button">,
  "loading" | "children" | "disabled"
> & {
  busy: boolean;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  unavailable?: boolean;
  showSpinner?: boolean;
  statusMessage?: string;
  /** While running, shows its stage as the busy label and a thin bar under the button. */
  task?: LoadTask | null;
};

/** Primer keeps native enabled while busy; block implicit form submit (Enter) while `active`. */
function useBlockImplicitSubmit(buttonRef: RefObject<HTMLButtonElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const button = buttonRef.current;
    const form = button?.form;
    if (!form || !button) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      const submitter = event.submitter;
      if (submitter != null && submitter !== button) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    form.addEventListener("submit", onSubmit, true);
    return () => {
      form.removeEventListener("submit", onSubmit, true);
    };
  }, [active, buttonRef]);
}

interface BusyCopyInput {
  busy: boolean;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  statusMessage?: string;
  stageLabel: string | null;
}

/** Visible label and polite status text; a running task's stage replaces the busy label. */
function busyCopy({ busy, idleLabel, busyLabel, statusMessage, stageLabel }: BusyCopyInput) {
  if (!busy) {
    return { label: idleLabel, statusText: "" };
  }
  if (stageLabel !== null) {
    return { label: `${stageLabel}…`, statusText: "" };
  }
  return {
    label: busyLabel,
    statusText: statusMessage ?? (typeof busyLabel === "string" ? busyLabel : "Working…"),
  };
}

/**
 * Progress drawn inside the button: the filled share sweeps left to right
 * behind the label, so the action bar needs no extra row.
 */
function ButtonProgressFill({
  percent,
  label,
  valueText,
}: {
  percent: number;
  label: string;
  valueText: string;
}) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className="pointer-events-none absolute inset-y-0 left-0 z-0 transition-[width] duration-300 ease-out motion-reduce:transition-none"
      style={{
        width: `${percent}%`,
        backgroundColor: "oklch(1 0 0 / 0.22)",
      }}
    />
  );
}

export function EntryAsyncButton({
  busy,
  idleLabel,
  busyLabel,
  unavailable = false,
  showSpinner = true,
  statusMessage,
  task = null,
  leftSection,
  onClick,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: EntryAsyncButtonProps): React.JSX.Element {
  const statusId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const taskSnapshot = useLoadTask(task);
  const taskRunning = busy && taskSnapshot?.status === "running";
  const { label, statusText } = busyCopy({
    busy,
    idleLabel,
    busyLabel,
    statusMessage,
    stageLabel: taskRunning ? taskSnapshot.stageLabel : null,
  });
  const gated = unavailable && !busy;
  const blockActivation = busy || unavailable;
  const describedBy =
    [busy && !taskRunning ? statusId : null, ariaDescribedBy].filter(Boolean).join(" ") ||
    undefined;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (blockActivation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  useBlockImplicitSubmit(buttonRef, blockActivation);

  return (
    <>
      <Button
        {...rest}
        ref={buttonRef}
        disabled={gated}
        aria-disabled={blockActivation ? true : undefined}
        aria-busy={busy || undefined}
        aria-describedby={describedBy}
        leftSection={
          busy && showSpinner && !taskRunning ? (
            <LoadingSpinnerRing size="sm" className="text-current" />
          ) : (
            leftSection
          )
        }
        onClick={handleClick}
      >
        {taskRunning && taskSnapshot ? (
          <ButtonProgressFill
            percent={taskSnapshot.percent}
            label={taskSnapshot.label}
            valueText={taskSnapshot.valueText}
          />
        ) : null}
        <span className="relative z-[1]">{label}</span>
      </Button>
      {taskRunning && taskSnapshot ? (
        <span role="status" aria-live="polite" className="sr-only">
          {taskSnapshot.stageLabel}
        </span>
      ) : null}
      {statusText ? (
        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {statusText}
        </span>
      ) : null}
    </>
  );
}
