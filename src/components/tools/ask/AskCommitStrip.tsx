/**
 * PrimedCommitStrip — muted until canCommit; terracotta btn-primary only when armed.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
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
      <button
        type="button"
        data-armed={armed ? "true" : "false"}
        disabled={!armed}
        aria-busy={isSubmitting || undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={onCommit}
        className={
          armed
            ? "btn-primary ask-commit-strip__btn w-full"
            : "ask-commit-strip__btn ask-commit-strip__btn--muted w-full"
        }
      >
        {isSubmitting ? "Sending…" : label}
      </button>
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
