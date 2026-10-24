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
import { LoadProgress } from "@/components/ui/feedback/LoadProgress";
import { useLoadTask } from "@/hooks/progress/useLoadTask";
import type { LoadTask } from "@/services/core/progress/loadTask";

export type EntryAsyncButtonProps = Omit<
  ButtonProps & ComponentPropsWithoutRef<"button">,
  "loading" | "children" | "disabled"
> & {
  busy: boolean;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  /** Native disabled when the action cannot run (gate). Ignored as the sole busy mechanism. */
  unavailable?: boolean;
  showSpinner?: boolean;
  /** Polite status text while busy; defaults to stringified busyLabel when string. */
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
          busy && showSpinner ? (
            <LoadingSpinnerRing size="sm" className="text-current" />
          ) : (
            leftSection
          )
        }
        onClick={handleClick}
      >
        {label}
      </Button>
      {taskRunning && task ? <LoadProgress task={task} variant="compact" /> : null}
      {statusText ? (
        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {statusText}
        </span>
      ) : null}
    </>
  );
}
