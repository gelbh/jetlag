import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { HiderTruthResult } from "../../domain/questions/hiderTruth";
import {
  buildPendingPreviewEliminationFeatures,
  pendingQuestionHasResolvedAnnotation,
} from "../../domain/questions/overlays/pendingPreviewElimination";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";

interface UseHiderPendingPreviewEliminationsParams {
  pendingQuestions: readonly PendingQuestionRecord[];
  questionTruths: ReadonlyMap<string, HiderTruthResult>;
  optimisticAnswers: ReadonlyMap<string, string>;
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea | null | undefined;
}

function buildReplyIdMap(
  pendingQuestions: readonly PendingQuestionRecord[],
  questionTruths: ReadonlyMap<string, HiderTruthResult>,
  optimisticAnswers: ReadonlyMap<string, string>,
  annotations: readonly AnnotationRecord[],
): Map<string, string> {
  const replyIds = new Map<string, string>();

  for (const pending of pendingQuestions) {
    if (pendingQuestionHasResolvedAnnotation(pending, annotations)) {
      continue;
    }

    const optimisticReplyId = optimisticAnswers.get(pending.id);
    if (optimisticReplyId) {
      replyIds.set(pending.id, optimisticReplyId);
      continue;
    }

    if (pending.status === "answered") {
      const answeredReplyId =
        typeof pending.answer === "string"
          ? pending.answer
          : pending.answer != null
            ? String(pending.answer)
            : null;
      if (answeredReplyId) {
        replyIds.set(pending.id, answeredReplyId);
      }
      continue;
    }

    if (pending.status !== "pending") {
      continue;
    }

    const truth = questionTruths.get(pending.id);
    if (truth && !truth.unavailable && truth.replyId.length > 0) {
      replyIds.set(pending.id, truth.replyId);
    }
  }

  return replyIds;
}

export function useHiderPendingPreviewEliminations({
  pendingQuestions,
  questionTruths,
  optimisticAnswers,
  annotations,
  gameArea,
}: UseHiderPendingPreviewEliminationsParams): {
  previewEliminationFeatures: Feature<Polygon | MultiPolygon>[];
} {
  const [previewEliminationFeatures, setPreviewEliminationFeatures] = useState<
    Feature<Polygon | MultiPolygon>[]
  >(() => []);
  const generationRef = useRef(0);

  const replyIdByQuestionId = useMemo(
    () =>
      buildReplyIdMap(
        pendingQuestions,
        questionTruths,
        optimisticAnswers,
        annotations,
      ),
    [annotations, optimisticAnswers, pendingQuestions, questionTruths],
  );

  const replyKey = useMemo(
    () =>
      [...replyIdByQuestionId.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([questionId, replyId]) => `${questionId}:${replyId}`)
        .join("|"),
    [replyIdByQuestionId],
  );

  const pendingKey = useMemo(
    () =>
      pendingQuestions
        .map(
          (question) =>
            `${question.id}:${question.status}:${question.resolvedAnnotationId ?? ""}`,
        )
        .join(","),
    [pendingQuestions],
  );

  const annotationKey = useMemo(
    () =>
      annotations
        .filter((annotation) => annotation.status === "active")
        .map((annotation) => annotation.id)
        .sort()
        .join(","),
    [annotations],
  );

  useEffect(() => {
    if (!gameArea || replyIdByQuestionId.size === 0) {
      setPreviewEliminationFeatures([]);
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    void buildPendingPreviewEliminationFeatures(
      pendingQuestions,
      replyIdByQuestionId,
      gameArea,
      annotations,
    )
      .then((features) => {
        if (generation === generationRef.current) {
          setPreviewEliminationFeatures(features);
        }
      })
      .catch(() => {
        if (generation === generationRef.current) {
          setPreviewEliminationFeatures([]);
        }
      });
  }, [
    annotations,
    gameArea,
    pendingKey,
    pendingQuestions,
    replyIdByQuestionId,
    replyKey,
    annotationKey,
  ]);

  return { previewEliminationFeatures };
}
