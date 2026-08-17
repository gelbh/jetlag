/**
 * PrimedCommitStrip — muted until canCommit; Survey flag Button when armed.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Button } from "@/components/ui/button";

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
    <div
      data-testid="ask-commit-strip"
      className="ask-commit-strip pointer-events-auto"
    >
      <Button
        type="button"
        variant={armed ? "flag" : "default"}
        data-armed={armed ? "true" : "false"}
        disabled={!armed}
        aria-busy={isSubmitting || undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={onCommit}
        className="ask-commit-strip__btn w-full min-h-12 font-display text-xs font-semibold uppercase tracking-[0.06em]"
      >
        {isSubmitting ? "Sending…" : label}
      </Button>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="ask-commit-strip__error text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
