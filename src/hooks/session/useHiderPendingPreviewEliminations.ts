import type { Feature, MultiPolygon, Polygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { previewGeometryFingerprint } from "../../domain/geometry/measuring/previewGeometryFingerprint";
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

function gameAreaContentKey(gameArea: GameArea | null | undefined): string {
  return (
    previewGeometryFingerprint(
      gameArea
        ? {
            type: "Feature",
            properties: {},
            geometry: gameArea,
          }
        : null,
    ) ?? "null"
  );
}

function pendingPlacementValueKey(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => pendingPlacementValueKey(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) => `${JSON.stringify(key)}:${pendingPlacementValueKey(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
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
  const pendingQuestionsRef = useRef(pendingQuestions);
  const replyIdByQuestionIdRef = useRef<ReadonlyMap<string, string>>(new Map());
  const annotationsRef = useRef(annotations);
  const gameAreaRef = useRef(gameArea);

  const replyIdByQuestionId = useMemo(
    () => buildReplyIdMap(pendingQuestions, questionTruths, optimisticAnswers, annotations),
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

  const gameAreaKey = useMemo(() => gameAreaContentKey(gameArea), [gameArea]);

  const pendingKey = useMemo(
    () =>
      pendingQuestions
        .map((question) =>
          [
            question.id,
            question.status,
            question.resolvedAnnotationId ?? "",
            question.toolType,
            question.placement.geometryJson,
            pendingPlacementValueKey(question.placement.metadata),
          ].join(":"),
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

  const shouldComputePreview = Boolean(gameArea) && replyIdByQuestionId.size > 0;

  useEffect(() => {
    pendingQuestionsRef.current = pendingQuestions;
  }, [pendingQuestions]);

  useEffect(() => {
    replyIdByQuestionIdRef.current = replyIdByQuestionId;
  }, [replyIdByQuestionId]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    gameAreaRef.current = gameArea;
  }, [gameArea]);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    const currentGameArea = gameAreaRef.current;
    if (!shouldComputePreview || !currentGameArea) {
      return;
    }

    void buildPendingPreviewEliminationFeatures(
      pendingQuestionsRef.current,
      replyIdByQuestionIdRef.current,
      currentGameArea,
      annotationsRef.current,
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
  }, [gameAreaKey, pendingKey, replyKey, annotationKey, shouldComputePreview]);

  return {
    previewEliminationFeatures: shouldComputePreview ? previewEliminationFeatures : [],
  };
}
