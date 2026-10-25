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
import type { LoadTask, LoadTaskSnapshot } from "@/services/core/progress/loadTask";

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
  /** While running, its stage becomes the busy label and its progress fills the button. */
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

/** Decorative fill drawn inside the button: the done share sweeps left to right behind the label. */
function ButtonProgressFill({ percent }: { percent: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-0 transition-[width] duration-300 ease-out motion-reduce:transition-none"
      style={{ width: `${percent}%`, backgroundColor: "oklch(1 0 0 / 0.22)" }}
    />
  );
}

/**
 * Screen-reader side of a running task, kept outside the button so the native
 * progress value does not leak into the button's accessible name.
 */
function TaskAnnouncements({ snapshot }: { snapshot: LoadTaskSnapshot }) {
  return (
    <>
      <progress
        className="sr-only"
        max={100}
        value={snapshot.percent}
        aria-label={snapshot.label}
        aria-valuetext={snapshot.valueText}
      />
      <span role="status" aria-live="polite" className="sr-only">
        {snapshot.stageLabel}
      </span>
    </>
  );
}

interface BusyStateInput extends Omit<BusyCopyInput, "stageLabel"> {
  task: LoadTask | null;
  unavailable: boolean;
  showSpinner: boolean;
  statusId: string;
  ariaDescribedBy: string | undefined;
}

/** All of the button's busy/gated branching, so the component only wires props. */
function useBusyState({
  busy,
  task,
  unavailable,
  showSpinner,
  statusId,
  ariaDescribedBy,
  ...copy
}: BusyStateInput) {
  const snapshot = useLoadTask(task);
  const runningSnapshot = busy && snapshot?.status === "running" ? snapshot : null;
  const { label, statusText } = busyCopy({
    ...copy,
    busy,
    stageLabel: runningSnapshot?.stageLabel ?? null,
  });
  const describedBy =
    [statusText ? statusId : null, ariaDescribedBy].filter(Boolean).join(" ") || undefined;
  return {
    label,
    statusText,
    describedBy,
    runningSnapshot,
    gated: unavailable && !busy,
    blockActivation: busy || unavailable,
    showBusySpinner: busy && showSpinner && runningSnapshot === null,
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
  const state = useBusyState({
    busy,
    task,
    unavailable,
    showSpinner,
    statusId,
    ariaDescribedBy,
    idleLabel,
    busyLabel,
    statusMessage,
  });

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (state.blockActivation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  useBlockImplicitSubmit(buttonRef, state.blockActivation);

  return (
    <>
      <Button
        {...rest}
        ref={buttonRef}
        disabled={state.gated}
        aria-disabled={state.blockActivation ? true : undefined}
        aria-busy={busy || undefined}
        aria-describedby={state.describedBy}
        leftSection={
          state.showBusySpinner ? (
            <LoadingSpinnerRing size="sm" className="text-current" />
          ) : (
            leftSection
          )
        }
        onClick={handleClick}
      >
        {state.runningSnapshot ? (
          <ButtonProgressFill percent={state.runningSnapshot.percent} />
        ) : null}
        <span className="relative z-[1]">{state.label}</span>
      </Button>
      {state.runningSnapshot ? <TaskAnnouncements snapshot={state.runningSnapshot} /> : null}
      {state.statusText ? (
        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {state.statusText}
        </span>
      ) : null}
    </>
  );
}
