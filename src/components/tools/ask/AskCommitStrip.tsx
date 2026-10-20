/**
 * AskCommitStrip — muted until canCommit; Survey flag Button when armed.
 * Flag on: iOS continuous filled / gray controls.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskInlineError } from "@/components/tools/shared/readout/AskInlineError";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
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

  return (
    <div data-testid="ask-commit-strip" className="pointer-events-auto flex flex-col gap-1.5">
      <EntryAsyncButton
        type="button"
        fullWidth
        data-armed={armed ? "true" : "false"}
        busy={isSubmitting}
        unavailable={!canCommit}
        idleLabel={label}
        busyLabel="Sending…"
        aria-describedby={error ? errorId : undefined}
        onClick={onCommit}
        className="min-h-[var(--ask-hud-strip-height,3rem)]"
        styles={armed || isSubmitting ? filledStyles : grayStyles}
      />
      {error ? <AskInlineError id={errorId} message={error} /> : null}
    </div>
  );
}
