import { useCallback, useMemo, useState } from "react";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";

function pendingIdsKey(pendingQuestions: readonly PendingQuestionRecord[]): string {
  return pendingQuestions.map((question) => question.id).join("\0");
}

export function useSeekerOptimisticPendingOverlays(
  pendingQuestions: readonly PendingQuestionRecord[],
) {
  const [optimisticEntries, setOptimisticEntries] = useState<
    PendingQuestionRecord[]
  >([]);
  const [ackedIds, setAckedIds] = useState(
    () => new Set(pendingQuestions.map((question) => question.id)),
  );
  const [prevIdsKey, setPrevIdsKey] = useState(() =>
    pendingIdsKey(pendingQuestions),
  );
  const nextIdsKey = pendingIdsKey(pendingQuestions);

  if (nextIdsKey !== prevIdsKey) {
    setPrevIdsKey(nextIdsKey);
    let changed = false;
    const next = new Set(ackedIds);
    for (const question of pendingQuestions) {
      if (!next.has(question.id)) {
        next.add(question.id);
        changed = true;
      }
    }
    if (changed) {
      setAckedIds(next);
    }
  }

  const registerOptimisticPending = useCallback(
    (entry: PendingQuestionRecord) => {
      if (
        pendingQuestions.some((question) => question.id === entry.id) ||
        ackedIds.has(entry.id)
      ) {
        return;
      }

      setOptimisticEntries((previous) => {
        if (previous.some((item) => item.id === entry.id)) {
          return previous;
        }

        return [...previous, entry];
      });
    },
    [ackedIds, pendingQuestions],
  );

  const unsyncedOptimisticQuestions = useMemo(
    () =>
      optimisticEntries.filter(
        (entry) =>
          !pendingQuestions.some((question) => question.id === entry.id) &&
          !ackedIds.has(entry.id),
      ),
    [ackedIds, optimisticEntries, pendingQuestions],
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
