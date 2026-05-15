import { useCallback } from "react";
import { useAnnotationStore, useMapStore } from "../state/sessionStore";

export function useGeometryEdit() {
  const geometryEditAnnotationId = useAnnotationStore(
    (state) => state.geometryEditAnnotationId,
  );
  const setGeometryEditAnnotationId = useAnnotationStore(
    (state) => state.setGeometryEditAnnotationId,
  );
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const setActiveTool = useMapStore((state) => state.setActiveTool);

  const startGeometryEdit = useCallback(
    (annotationId: string) => {
      setSelectedAnnotationId(null);
      setActiveTool("none");
      setGeometryEditAnnotationId(annotationId);
    },
    [setActiveTool, setGeometryEditAnnotationId, setSelectedAnnotationId],
  );

  const cancelGeometryEdit = useCallback(() => {
    setGeometryEditAnnotationId(null);
  }, [setGeometryEditAnnotationId]);

  return {
    geometryEditAnnotationId,
    startGeometryEdit,
    cancelGeometryEdit,
  };
}
