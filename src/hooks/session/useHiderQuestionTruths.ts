import { useEffect, useMemo, useState } from "react";
import {
  computeHiderTruthReplyAsync,
  type HiderTruthResult,
} from "../../domain/questions/ui";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { useLatestRequest } from "../useLatestRequest";

const EMPTY_TRUTHS = new Map<string, HiderTruthResult>();

function stationCenterKey(stationCenter: LatLngTuple | null): string {
  if (!stationCenter) {
    return "none";
  }

  return `${stationCenter[0].toFixed(6)},${stationCenter[1].toFixed(6)}`;
}

function openPendingQuestions(
  pendingQuestions: readonly PendingQuestionRecord[],
): PendingQuestionRecord[] {
  return pendingQuestions.filter((question) => question.status === "pending");
}

export function useHiderQuestionTruths(
  pendingQuestions: readonly PendingQuestionRecord[],
  stationCenter: LatLngTuple | null,
): {
  questionTruths: ReadonlyMap<string, HiderTruthResult>;
  loading: boolean;
} {
  const [questionTruths, setQuestionTruths] = useState<
    ReadonlyMap<string, HiderTruthResult>
  >(() => new Map());
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const openQuestions = useMemo(
    () => openPendingQuestions(pendingQuestions),
    [pendingQuestions],
  );

  const openQuestionKey = useMemo(
    () =>
      openQuestions
        .map((question) => question.id)
        .sort()
        .join(","),
    [openQuestions],
  );

  const stationKey = stationCenterKey(stationCenter);
  const fetchKey = `${openQuestionKey}|${stationKey}`;
  const loading =
    openQuestions.length > 0 && resolvedFetchKey !== fetchKey;

  useEffect(() => {
    if (openQuestions.length === 0) {
      return;
    }

    const requestId = beginRequest();

    void (async () => {
      const entries = await Promise.all(
        openQuestions.map(async (question) => {
          const truth = await computeHiderTruthReplyAsync(
            question,
            stationCenter,
          );
          return [question.id, truth] as const;
        }),
      );

      if (!isLatestRequest(requestId)) {
        return;
      }

      const nextTruths = new Map<string, HiderTruthResult>();
      for (const [questionId, truth] of entries) {
        if (truth) {
          nextTruths.set(questionId, truth);
        }
      }

      setQuestionTruths(nextTruths);
      setResolvedFetchKey(fetchKey);
    })();
  }, [
    fetchKey,
    beginRequest,
    isLatestRequest,
    openQuestions,
    stationCenter,
  ]);

  return {
    questionTruths: openQuestions.length === 0 ? EMPTY_TRUTHS : questionTruths,
    loading: openQuestions.length === 0 ? false : loading,
  };
}
