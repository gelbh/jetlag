/**
 * AskCommitStrip — muted until canCommit; Survey flag Button when armed.
 * Flag on: iOS continuous filled / gray controls.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Button } from "@mantine/core";
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryChrome";

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
    <div data-testid="ask-commit-strip" className="pointer-events-auto flex flex-col gap-1.5">
      <Button
        type="button"
        fullWidth
        data-armed={armed ? "true" : "false"}
        disabled={!armed}
        aria-busy={isSubmitting || undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={onCommit}
        className="min-h-[var(--ask-hud-strip-height,3rem)]"
        styles={armed ? filledStyles : grayStyles}
      >
        {buttonLabel}
      </Button>
      {error ? <AskInlineError id={errorId} message={error} /> : null}
    </div>
  );
}
