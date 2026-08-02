import { useEffect, useMemo, useState } from "react";
import {
  computeHiderTruthReplyAsync,
  type HiderTruthResult,
} from "../../domain/questions/ui";
import type { HiderTruthReferenceMode } from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useLatestRequest } from "../forms/useLatestRequest";

const EMPTY_TRUTHS = new Map<string, HiderTruthResult>();

function truthReferenceKey(
  truthReference: LatLngTuple | null,
  mode: HiderTruthReferenceMode,
): string {
  if (!truthReference) {
    return `none:${mode}`;
  }

  return `${mode}:${truthReference[0].toFixed(6)},${truthReference[1].toFixed(6)}`;
}

function openPendingQuestions(
  pendingQuestions: readonly PendingQuestionRecord[],
): PendingQuestionRecord[] {
  return pendingQuestions.filter((question) => question.status === "pending");
}

export function useHiderQuestionTruths(
  pendingQuestions: readonly PendingQuestionRecord[],
  truthReference: LatLngTuple | null,
  gameArea?: GameArea,
  options?: {
    truthReferenceReady?: boolean;
    truthReferenceMode?: HiderTruthReferenceMode;
  },
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

  const truthReferenceMode = options?.truthReferenceMode ?? "hidingZoneCenter";
  const referenceKey = truthReferenceKey(truthReference, truthReferenceMode);
  const fetchKey = `${openQuestionKey}|${referenceKey}`;
  const truthReferenceReady = options?.truthReferenceReady ?? true;
  const loading =
    openQuestions.length > 0 &&
    (!truthReferenceReady || resolvedFetchKey !== fetchKey);

  useEffect(() => {
    if (openQuestions.length === 0 || !truthReferenceReady) {
      return;
    }

    const requestId = beginRequest();

    void (async () => {
      const entries = await Promise.all(
        openQuestions.map(async (question) => {
          const truth = await computeHiderTruthReplyAsync(
            question,
            truthReference,
            gameArea,
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
    truthReference,
    gameArea,
    truthReferenceReady,
  ]);

  return {
    questionTruths: openQuestions.length === 0 ? EMPTY_TRUTHS : questionTruths,
    loading: openQuestions.length === 0 ? false : loading,
  };
}
