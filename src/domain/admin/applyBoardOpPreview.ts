import type { Feature, LineString } from "geojson";
import { distanceBetweenPoints } from "../geometry/gameArea/distance";
import { lineEndpointsFromFeature } from "../geometry/gameArea/geometryParsing";
import type { AnnotationRecord } from "../map/annotations";
import {
  type ThermometerAnswer,
  thermometerHotterTowards,
} from "../questions/thermometerQuestions";

export type BoardOpPreviewAction =
  | "softDeleteAnnotation"
  | "restoreAnnotation"
  | "recomputeThermometerFromHide";

export type BoardOpPreview = {
  action: BoardOpPreviewAction;
  annotationId: string;
  hide?: { lat: number; lng: number };
};

/**
 * Ops recompute: same A/B hotter rule as `truthThermometer` (end = B), without the
 * near-edge unavailable bailout so admin can always rewrite shade from the hide.
 */
export function computeThermometerAnswerFromHide(
  pointA: { lng: number; lat: number },
  pointB: { lng: number; lat: number },
  hide: { lng: number; lat: number },
): { answer: ThermometerAnswer; hotterTowards: "a" | "b" } {
  const distanceToA = distanceBetweenPoints([hide.lat, hide.lng], [pointA.lat, pointA.lng]);
  const distanceToB = distanceBetweenPoints([hide.lat, hide.lng], [pointB.lat, pointB.lng]);
  const answer: ThermometerAnswer = distanceToB + 1e-6 < distanceToA ? "hotter" : "colder";
  return { answer, hotterTowards: thermometerHotterTowards(answer) };
}

export function thermometerEndpointsFromAnnotation(
  annotation: AnnotationRecord,
): { pointA: { lng: number; lat: number }; pointB: { lng: number; lat: number } } | null {
  if (annotation.type !== "thermometer" || annotation.geometry.geometry?.type !== "LineString") {
    return null;
  }
  const endpoints = lineEndpointsFromFeature(annotation.geometry as Feature<LineString>);
  if (!endpoints) {
    return null;
  }
  return {
    pointA: { lat: endpoints.start[0], lng: endpoints.start[1] },
    pointB: { lat: endpoints.end[0], lng: endpoints.end[1] },
  };
}

/** Client-only draft annotations for spectator elim preview before Execute. */
export function applyBoardOpPreview(
  annotations: readonly AnnotationRecord[],
  op: BoardOpPreview,
): AnnotationRecord[] {
  return annotations.map((annotation) => {
    if (annotation.id !== op.annotationId) {
      return annotation;
    }

    if (op.action === "softDeleteAnnotation") {
      return { ...annotation, status: "deleted" };
    }

    if (op.action === "restoreAnnotation") {
      return { ...annotation, status: "active" };
    }

    if (op.action === "recomputeThermometerFromHide") {
      if (!op.hide) {
        return annotation;
      }
      const endpoints = thermometerEndpointsFromAnnotation(annotation);
      if (!endpoints) {
        return annotation;
      }
      const { answer, hotterTowards } = computeThermometerAnswerFromHide(
        endpoints.pointA,
        endpoints.pointB,
        op.hide,
      );
      return {
        ...annotation,
        status: "active",
        metadata: {
          ...annotation.metadata,
          thermometerAnswer: answer,
          hotterTowards,
        },
      };
    }

    return annotation;
  });
}
