/**
 * AskCommitStrip — muted until canCommit; Survey flag Button when armed.
 * Flag on: iOS continuous filled / gray controls.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Button } from "@mantine/core";
import {
  filledStyles,
  grayStyles,
} from "@/components/ui/entry/entryChrome";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";

type AskCommitStripProps = {
  canCommit: boolean;
  label: string;
  onCommit: () => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function AskCommitStrip({
  canCommit,
  label,
  onCommit,
  isSubmitting = false,
  error = null,
}: AskCommitStripProps) {
  const armed = canCommit && !isSubmitting;
  const errorId = "ask-commit-strip-error";
  const buttonLabel = isSubmitting ? "Sending…" : label;

  return (
    <div
      data-testid="ask-commit-strip"
      className="ask-commit-strip pointer-events-auto"
    >
      <Button
        type="button"
        fullWidth
        data-armed={armed ? "true" : "false"}
        disabled={!armed}
        aria-busy={isSubmitting || undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={onCommit}
        className="ask-commit-strip__btn"
        styles={armed ? filledStyles : grayStyles}
      >
        {buttonLabel}
      </Button>
      {error ? <AskInlineError id={errorId} message={error} /> : null}
    </div>
  );
}
