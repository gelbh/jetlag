import { Button, type ButtonProps } from "@mantine/core";
import {
  type ComponentPropsWithoutRef,
  type MouseEventHandler,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { LoadingSpinnerRing } from "@/components/ui/feedback/LoadingSpinner";

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
};

export function EntryAsyncButton({
  busy,
  idleLabel,
  busyLabel,
  unavailable = false,
  showSpinner = true,
  statusMessage,
  leftSection,
  onClick,
  ...rest
}: EntryAsyncButtonProps): React.JSX.Element {
  const statusId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = busy ? busyLabel : idleLabel;
  const statusText = busy
    ? (statusMessage ?? (typeof busyLabel === "string" ? busyLabel : "Working…"))
    : "";
  const gated = unavailable && !busy;
  const blockActivation = busy || unavailable;

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (blockActivation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  // Primer keeps native enabled while busy; block implicit form submit (Enter).
  useEffect(() => {
    if (!blockActivation) {
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
  }, [blockActivation]);

  return (
    <>
      <Button
        {...rest}
        ref={buttonRef}
        disabled={gated}
        aria-disabled={blockActivation ? true : undefined}
        aria-busy={busy || undefined}
        aria-describedby={busy ? statusId : undefined}
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
      {busy ? (
        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {statusText}
        </span>
      ) : null}
    </>
  );
}
