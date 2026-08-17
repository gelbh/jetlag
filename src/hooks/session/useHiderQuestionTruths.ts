import { useEffect, useMemo, useState } from "react";
import {
  computeHiderTruthReplyAsync,
  type HiderTruthResult,
} from "../../domain/questions/ui";
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

function seekerPlacesKey(
  places: Readonly<Record<string, readonly [number, number]>> | null | undefined,
): string {
  if (!places) {
    return "none";
  }
  return Object.keys(places)
    .sort()
    .map((uid) => `${uid}:${places[uid]?.join(",") ?? ""}`)
    .join(";");
}

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

  const contextKey = truthContext
    ? [
        truthContext.hiderUid,
        truthContext.zoneCenter?.join(",") ?? "none",
        truthContext.hidingPlace?.join(",") ?? "none",
        String(truthContext.zoneRadiusMeters ?? "none"),
        truthContext.session?.endGameStartedAt ?? "none",
        seekerPlacesKey(truthContext.seekerPlacesByUid),
      ].join("|")
    : "none";

  const openQuestionKey = useMemo(
    () =>
      openQuestions
        .map((question) => question.id)
        .sort()
        .join(","),
    [openQuestions],
  );

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

  const fetchKey = `${openQuestionKey}|${contextKey}`;
  const truthReferenceReady = options?.truthReferenceReady ?? true;
  const loading =
    openQuestions.length > 0 &&
    (!truthReferenceReady || resolvedFetchKey !== fetchKey);

  useEffect(() => {
    if (openQuestions.length === 0 || !truthReferenceReady || !truthContext) {
      return;
    }

    const requestId = beginRequest();
    const context = truthContext;

    void (async () => {
      const entries = await Promise.all(
        openQuestions.map(async (question) => {
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

      setQuestionTruths(nextTruths);
      setResolvedFetchKey(fetchKey);
    })();
  }, [
    fetchKey,
    beginRequest,
    isLatestRequest,
    openQuestions,
    truthContext,
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
