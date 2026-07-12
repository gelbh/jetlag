import { useCallback, useState, type ReactNode } from "react";

interface UseTutorialQuestionCommitOptions {
  enabled: boolean;
  canCommit: boolean;
}

export function useTutorialQuestionCommit({
  enabled,
  canCommit,
}: UseTutorialQuestionCommitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  const handleCommit = useCallback(() => {
    if (!enabled || !canCommit || committed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setCommitted(true);
    }, 350);
  }, [canCommit, committed, enabled, isSubmitting]);

  const committedNote: ReactNode =
    enabled && committed ? (
      <p className="text-center text-xs text-status-success">
        Practice question added — no cards spent in the tutorial.
      </p>
    ) : null;

  return {
    handleCommit,
    committedNote,
    isSubmitting,
    committed,
  };
}
