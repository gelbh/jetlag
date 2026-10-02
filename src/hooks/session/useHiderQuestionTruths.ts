import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeHiderTruthReplyAsync,
  type HiderTruthResult,
} from "../../domain/questions/ui";
import { buildHiderTruthFetchKey } from "../../domain/questions/hiderTruth/hiderTruthFetchKey";
import { reuseHiderTruthMapIfEqual } from "../../domain/questions/hiderTruth/hiderTruthMapReuse";
import {
  resolvePendingQuestionTruthReference,
  type HiderQuestionTruthContextInput,
  type HiderTruthReferenceMode,
} from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { GameArea } from "../../domain/map/annotations";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useLatestRequest } from "../forms/useLatestRequest";

const EMPTY_TRUTHS = new Map<string, HiderTruthResult>();
const EMPTY_MODES = new Map<string, HiderTruthReferenceMode>();

function openPendingQuestions(
  pendingQuestions: readonly PendingQuestionRecord[],
): PendingQuestionRecord[] {
  return pendingQuestions.filter((question) => question.status === "pending");
}

export type HiderQuestionTruthContext = HiderQuestionTruthContextInput;

export function useHiderQuestionTruths(
  pendingQuestions: readonly PendingQuestionRecord[],
  truthContext: HiderQuestionTruthContext | null,
  gameArea?: GameArea,
  options?: {
    truthReferenceReady?: boolean;
  },
): {
  questionTruths: ReadonlyMap<string, HiderTruthResult>;
  loading: boolean;
  /** Per open question id → reference mode for picker labels. */
  truthReferenceModes: ReadonlyMap<string, HiderTruthReferenceMode>;
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
  const openQuestionsRef = useRef(openQuestions);
  const truthContextRef = useRef(truthContext);
  openQuestionsRef.current = openQuestions;
  truthContextRef.current = truthContext;

  const fetchKey =
    truthContext && openQuestions.length > 0
      ? buildHiderTruthFetchKey(openQuestions, truthContext)
      : "none";

  const truthReferenceModes = useMemo(() => {
    if (!truthContext || openQuestions.length === 0) {
      return EMPTY_MODES;
    }
    const modes = new Map<string, HiderTruthReferenceMode>();
    for (const question of openQuestions) {
      modes.set(
        question.id,
        resolvePendingQuestionTruthReference(question, truthContext).mode,
      );
    }
    return modes;
  }, [openQuestions, truthContext]);
  const truthReferenceReady = options?.truthReferenceReady ?? true;
  const loading =
    openQuestions.length > 0 &&
    (!truthReferenceReady || resolvedFetchKey !== fetchKey);

  useEffect(() => {
    const open = openQuestionsRef.current;
    const context = truthContextRef.current;

    if (open.length === 0 || !truthReferenceReady || !context) {
      return;
    }

    const requestId = beginRequest();

    void (async () => {
      const entries = await Promise.all(
        open.map(async (question) => {
          const reference = resolvePendingQuestionTruthReference(
            question,
            context,
          );
          const truth = await computeHiderTruthReplyAsync(
            question,
            reference.point,
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

      setQuestionTruths((previous) =>
        reuseHiderTruthMapIfEqual(previous, nextTruths),
      );
      setResolvedFetchKey(fetchKey);
    })();
  }, [
    fetchKey,
    beginRequest,
    isLatestRequest,
    gameArea,
    truthReferenceReady,
  ]);

  return {
    questionTruths: openQuestions.length === 0 ? EMPTY_TRUTHS : questionTruths,
    loading: openQuestions.length === 0 ? false : loading,
    truthReferenceModes:
      openQuestions.length === 0 ? EMPTY_MODES : truthReferenceModes,
  };
}
