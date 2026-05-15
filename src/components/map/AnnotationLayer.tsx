import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import { isActive } from "../../domain/annotations";
import { gameAreaToPolygon } from "../../domain/geometry";
import {
  useAnnotationStore,
  useMapStore,
  type LayerVisibility,
} from "../../state/sessionStore";
import { renderAnnotationLayerItem } from "./annotationLayerRegistry";

interface AnnotationLayerProps {
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  hidden?: boolean;
  selectedAnnotationId?: string | null;
  layerVisibility?: LayerVisibility;
}

export function AnnotationLayer({
  annotations,
  gameArea,
  hidden,
  selectedAnnotationId = null,
  layerVisibility,
}: AnnotationLayerProps) {
  const pulsingAnnotationIds = useAnnotationStore(
    (state) => state.pulsingAnnotationIds,
  );
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const geometryEditAnnotationId = useAnnotationStore(
    (state) => state.geometryEditAnnotationId,
  );
  const activeTool = useMapStore((state) => state.activeTool);
  const selectionEnabled =
    activeTool === "none" && geometryEditAnnotationId === null;

  if (hidden) {
    return null;
  }

  const gamePolygon = gameAreaToPolygon(gameArea);

  return (
    <>
      {annotations.filter(isActive).map((annotation) =>
        renderAnnotationLayerItem({
          annotation,
          gameArea,
          gamePolygon,
          layerVisibility,
          pulsingAnnotationIds,
          selectedAnnotationId,
          selectionEnabled,
          selectAnnotation: () => setSelectedAnnotationId(annotation.id),
        }),
      )}
    </>
  );
}
