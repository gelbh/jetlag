import { useEffect, useMemo, useRef, useState } from "react";
import {
  createLoadTask,
  getNamedLoadTask,
  setNamedLoadTask,
} from "@/services/core/progress/loadTask";
import { HIDER_TRUTHS_TASK } from "@/services/core/progress/namedTasks";
import type { GameArea } from "../../domain/map/annotations";
import { buildHiderTruthFetchKey } from "../../domain/questions/hiderTruth/hiderTruthFetchKey";
import { reuseHiderTruthMapIfEqual } from "../../domain/questions/hiderTruth/hiderTruthMapReuse";
import {
  type HiderTruthReferenceMode,
  type ResolveHiderTruthReferenceInput,
  resolveHiderTruthReference,
} from "../../domain/questions/hiderTruth/resolveHiderTruthReference";
import { truthUnavailable, UNAVAILABLE_NO_ANCHOR } from "../../domain/questions/hiderTruth/shared";
import { computeHiderTruthReplyAsync, type HiderTruthResult } from "../../domain/questions/ui";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useLatestRequest } from "../forms/useLatestRequest";

const EMPTY_TRUTHS = new Map<string, HiderTruthResult>();
const EMPTY_MODES = new Map<string, HiderTruthReferenceMode>();

function openPendingQuestions(
  pendingQuestions: readonly PendingQuestionRecord[],
): PendingQuestionRecord[] {
  return pendingQuestions.filter((question) => question.status === "pending");
}

export function useHiderQuestionTruths(
  pendingQuestions: readonly PendingQuestionRecord[],
  truthContext: ResolveHiderTruthReferenceInput | null,
  gameArea?: GameArea,
  options?: {
    truthReferenceReady?: boolean;
  },
): {
  questionTruths: ReadonlyMap<string, HiderTruthResult>;
  loading: boolean;
  truthReferenceModes: ReadonlyMap<string, HiderTruthReferenceMode>;
} {
  const [questionTruths, setQuestionTruths] = useState<ReadonlyMap<string, HiderTruthResult>>(
    () => new Map(),
  );
  const [resolvedFetchKey, setResolvedFetchKey] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const openQuestions = useMemo(() => openPendingQuestions(pendingQuestions), [pendingQuestions]);
  const openQuestionsRef = useRef(openQuestions);
  const truthContextRef = useRef(truthContext);

  useEffect(() => {
    openQuestionsRef.current = openQuestions;
  }, [openQuestions]);

  useEffect(() => {
    truthContextRef.current = truthContext;
  }, [truthContext]);

  const fetchKey =
    truthContext && openQuestions.length > 0
      ? buildHiderTruthFetchKey(openQuestions, truthContext)
      : "none";

  const truthReferenceReady = options?.truthReferenceReady ?? true;
  const truthReferenceModes = useMemo(() => {
    if (!truthReferenceReady || !truthContext || openQuestions.length === 0) {
      return EMPTY_MODES;
    }
    const { mode } = resolveHiderTruthReference(truthContext);
    const modes = new Map<string, HiderTruthReferenceMode>();
    for (const question of openQuestions) {
      modes.set(question.id, mode);
    }
    return modes;
  }, [openQuestions, truthContext, truthReferenceReady]);
  const loading =
    openQuestions.length > 0 && (!truthReferenceReady || resolvedFetchKey !== fetchKey);

  useEffect(() => {
    const open = openQuestionsRef.current;
    const context = truthContextRef.current;

    if (open.length === 0 || !truthReferenceReady || !context) {
      return;
    }

    const requestId = beginRequest();
    const reference = resolveHiderTruthReference(context);
    const task = createLoadTask({
      label: open.length === 1 ? "Checking the question" : `Checking ${open.length} questions`,
      cancellable: false,
    });
    const checks = task.stage({
      kind: "group",
      label: "Checking questions",
      historyKey: "truth:batch",
      parallel: true,
    });
    for (const question of open) {
      checks.stage({
        kind: "compute",
        label: "Checking questions",
        historyKey: truthHistoryKey(question),
      });
    }
    setNamedLoadTask(HIDER_TRUTHS_TASK, task);

    void (async () => {
      let resolved = 0;
      const entries = await Promise.all(
        open.map(async (question, index) => {
          const stage = checks.children[index]?.start();
          const truth =
            reference.mode === "noHidingZone"
              ? null
              : reference.mode === "unavailable"
                ? truthUnavailable(UNAVAILABLE_NO_ANCHOR)
                : await computeHiderTruthReplyAsync(question, reference.point, gameArea);
          stage?.finish();
          resolved += 1;
          if (open.length > 1) {
            checks.setLabel(`Checking ${resolved} of ${open.length} questions`);
          }
          return [question.id, truth] as const;
        }),
      );

      task.complete();
      if (getNamedLoadTask(HIDER_TRUTHS_TASK) === task) {
        setNamedLoadTask(HIDER_TRUTHS_TASK, null);
      }
      if (!isLatestRequest(requestId)) {
        return;
      }

      const nextTruths = new Map<string, HiderTruthResult>();
      for (const [questionId, truth] of entries) {
        if (truth) {
          nextTruths.set(questionId, truth);
        }
      }

      setQuestionTruths((previous) => reuseHiderTruthMapIfEqual(previous, nextTruths));
      setResolvedFetchKey(fetchKey);
    })();
  }, [fetchKey, beginRequest, isLatestRequest, gameArea, truthReferenceReady]);

  return {
    questionTruths: openQuestions.length === 0 ? EMPTY_TRUTHS : questionTruths,
    loading: openQuestions.length === 0 ? false : loading,
    truthReferenceModes: openQuestions.length === 0 ? EMPTY_MODES : truthReferenceModes,
  };
}

function truthHistoryKey(question: { toolType?: string }): string {
  switch (question.toolType) {
    case "matching":
      return "truth:matching";
    case "measuring":
      return "truth:measuring";
    default:
      return "truth:other";
  }
}
