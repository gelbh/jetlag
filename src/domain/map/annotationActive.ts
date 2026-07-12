import type { AnnotationRecord } from "./annotations";

export function isActive(annotation: AnnotationRecord): boolean {
  return annotation.status === "active";
}
