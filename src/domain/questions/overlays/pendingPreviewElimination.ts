import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { isActive } from "../../map/annotationActive";
import { eliminationFeatureForAnnotation } from "../../geometry/adapter/eliminationMask";
import { resolvePendingAnnotationFromReply } from "../questionResolution/resolvePendingAnnotationFromReply";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";

export interface PendingPreviewEliminationInput {
  pending: PendingQuestionRecord;
  replyId: string;
  gameArea: GameArea;
}

function replyIdFromPendingAnswer(pending: PendingQuestionRecord): string | null {
  if (pending.answer === undefined || pending.answer === null) {
    return null;
  }

  return typeof pending.answer === "string"
    ? pending.answer
    : String(pending.answer);
}

export function pendingQuestionHasResolvedAnnotation(
  pending: PendingQuestionRecord,
  annotations: readonly AnnotationRecord[],
): boolean {
  if (annotations.some((annotation) => annotation.id === pending.id && isActive(annotation))) {
    return true;
  }

  if (!pending.resolvedAnnotationId) {
    return false;
  }

  return annotations.some(
    (annotation) =>
      annotation.id === pending.resolvedAnnotationId && isActive(annotation),
  );
}

export async function buildPendingPreviewEliminationFeature(
  input: PendingPreviewEliminationInput,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const { pending, replyId, gameArea } = input;
  if (!replyId) {
    return null;
  }

  const annotation = await resolvePendingAnnotationFromReply(
    pending,
    replyId,
    gameArea,
  );
  if (!annotation) {
    return null;
  }

  return eliminationFeatureForAnnotation(
    {
      ...annotation,
      id: pending.id,
      sessionId: pending.sessionId,
      status: "active",
    },
    gameArea,
  );
}

export async function buildPendingPreviewEliminationFeatures(
  pendingQuestions: readonly PendingQuestionRecord[],
  replyIdByQuestionId: ReadonlyMap<string, string>,
  gameArea: GameArea,
  annotations: readonly AnnotationRecord[],
): Promise<Feature<Polygon | MultiPolygon>[]> {
  const features: Feature<Polygon | MultiPolygon>[] = [];

  for (const pending of pendingQuestions) {
    if (pendingQuestionHasResolvedAnnotation(pending, annotations)) {
      continue;
    }

    const replyId =
      replyIdByQuestionId.get(pending.id) ?? replyIdFromPendingAnswer(pending);
    if (!replyId) {
      continue;
    }

    try {
      const feature = await buildPendingPreviewEliminationFeature({
        pending,
        replyId,
        gameArea,
      });
      if (feature) {
        features.push(feature);
      }
    } catch {
      // Measuring/matching WASM budget refuse or other soft-fail: skip shade only.
    }
  }

  return features;
}
