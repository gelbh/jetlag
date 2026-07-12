import { useCallback, useRef, useState } from "react";

interface UseTutorialQuestionCommitOptions {
  enabled: boolean;
}

export function useTutorialQuestionCommit({
  enabled,
}: UseTutorialQuestionCommitOptions) {
  const canCommitRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  const syncCanCommit = useCallback((canCommit: boolean) => {
    canCommitRef.current = canCommit;
  }, []);

  const handleCommit = useCallback(() => {
    if (!enabled || !canCommitRef.current || committed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setCommitted(true);
    }, 350);
  }, [committed, enabled, isSubmitting]);

  return {
    handleCommit,
    syncCanCommit,
    isSubmitting,
    committed,
  };
}
