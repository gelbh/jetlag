import type { AnnotationRecord } from "./annotations";

/**
 * Post-answer AnnotationEditSheet / session-log Edit / geometry edit.
 * Tentacle is elim-only after answer (matching-style); delete remains.
 */
export function annotationSupportsPostAnswerEdit(annotation: AnnotationRecord): boolean {
  return annotation.type !== "tentacle";
}

export function annotationSupportsGeometryEdit(annotation: AnnotationRecord): boolean {
  return annotationSupportsPostAnswerEdit(annotation);
}
