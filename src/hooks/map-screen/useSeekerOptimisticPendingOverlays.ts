import { useCallback, useMemo, useState } from "react";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";

export function useSeekerOptimisticPendingOverlays(
  pendingQuestions: readonly PendingQuestionRecord[],
) {
  const [optimisticEntries, setOptimisticEntries] = useState<
    PendingQuestionRecord[]
  >([]);

  const registerOptimisticPending = useCallback(
    (entry: PendingQuestionRecord) => {
      setOptimisticEntries((previous) => {
        if (previous.some((item) => item.id === entry.id)) {
          return previous;
        }

        return [...previous, entry];
      });
    },
    [],
  );

  const unsyncedOptimisticQuestions = useMemo(
    () =>
      optimisticEntries.filter(
        (entry) => !pendingQuestions.some((question) => question.id === entry.id),
      ),
    [optimisticEntries, pendingQuestions],
  );

  const displayPendingQuestions = useMemo(
    () => [...pendingQuestions, ...unsyncedOptimisticQuestions],
    [pendingQuestions, unsyncedOptimisticQuestions],
  );

  return {
    displayPendingQuestions,
    registerOptimisticPending,
  };
}
