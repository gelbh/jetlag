import { useMemo } from "react";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { useAnnotationStore } from "../../state/sessionStore";

export function useSessionAnnotations(
  sessionId: string | undefined,
): AnnotationRecord[] {
  const allAnnotations = useAnnotationStore((state) => state.annotations);

  return useMemo(
    () =>
      sessionId
        ? allAnnotations.filter(
            (annotation) => annotation.sessionId === sessionId,
          )
        : [],
    [allAnnotations, sessionId],
  );
}
